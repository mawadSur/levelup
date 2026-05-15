import 'server-only';
import { cookies, headers } from 'next/headers';
import { getSupabaseServerClient, isSupabaseConfigured } from './supabase/server';

const STUB_COOKIE = 'sb-stub-auth-token';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? '' : 'http://localhost:4000');

const SUPABASE_URL_FOR_REF = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';

function getSupabaseProjectRef(): string | null {
  if (SUPABASE_URL_FOR_REF === '' || SUPABASE_URL_FOR_REF.startsWith('PLACEHOLDER_')) {
    return null;
  }
  try {
    const host = new URL(SUPABASE_URL_FOR_REF).host;
    const ref = host.split('.')[0];
    return typeof ref === 'string' && ref !== '' ? ref : null;
  } catch {
    return null;
  }
}

/**
 * Decode an `sb-<ref>-auth-token` cookie value to extract the access token.
 *
 * @supabase/ssr v0.10+ stores the session as `base64-<base64-json>` where the
 * JSON has `{ access_token, refresh_token, expires_at, ... }`. Large sessions
 * are split across `sb-…-auth-token.0`, `.1`, …; the caller is responsible
 * for joining the chunks before passing here.
 *
 * Returns `undefined` if the value can't be decoded into a JWT-shaped string.
 */
function extractAccessTokenFromCookieValue(raw: string): string | undefined {
  if (raw === '') return undefined;
  let payload = raw;
  if (payload.startsWith('base64-')) {
    try {
      payload = Buffer.from(payload.slice('base64-'.length), 'base64').toString('utf8');
    } catch {
      return undefined;
    }
  }
  // Some legacy formats store the JWT directly. JWTs always start with eyJ.
  if (payload.startsWith('eyJ') && !payload.startsWith('{')) {
    return payload;
  }
  try {
    const parsed: unknown = JSON.parse(payload);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'access_token' in parsed &&
      typeof (parsed as { access_token: unknown }).access_token === 'string'
    ) {
      return (parsed as { access_token: string }).access_token;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function readSupabaseAccessTokenFromCookies(): Promise<string | undefined> {
  const projectRef = getSupabaseProjectRef();
  if (projectRef === null) return undefined;

  const cookieStore = await cookies();
  const base = `sb-${projectRef}-auth-token`;
  const main = cookieStore.get(base)?.value;
  if (typeof main === 'string' && main !== '') {
    const tok = extractAccessTokenFromCookieValue(main);
    if (typeof tok === 'string' && tok !== '') return tok;
  }
  // Chunked-cookie fallback for sessions large enough to overflow one cookie.
  const chunks: string[] = [];
  for (let i = 0; i < 10; i++) {
    const v = cookieStore.get(`${base}.${i}`)?.value;
    if (typeof v !== 'string' || v === '') break;
    chunks.push(v);
  }
  if (chunks.length > 0) {
    return extractAccessTokenFromCookieValue(chunks.join(''));
  }
  return undefined;
}

/**
 * CR.0 — kept exported for one release of compat. The legacy JWE cookie name
 * is no longer used; Supabase Auth manages its own `sb-<ref>-auth-token`
 * cookies via `@supabase/ssr`. Delete in the next major.
 */
export const LEVELUP_SESSION = 'LEVELUP_SESSION';

export interface SessionUser {
  /** Compat alias for `id` so older call sites keep working. */
  userId: string;
  id: string;
  organizationId: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  email: string;
  name: string;
  departmentId?: string | null;
  aiLevel?: string;
  orgName?: string;
  organizationName?: string;
  leaderboardOptOut?: boolean;
}

/**
 * Pure-logic helper — no DB access, safe to call from server components.
 *
 * Returns true when the given org name looks like a demo org or when its id
 * appears in the DEMO_ORG_ALLOWLIST env var. Used to gate the "Demo controls"
 * card on the admin dashboard.
 */
export function isDemoOrg(orgName: string, orgId: string): boolean {
  if (orgName.includes('[Demo]') || orgName.includes('Demo')) return true;
  const allowlistRaw: string =
    typeof process !== 'undefined' && typeof process.env.DEMO_ORG_ALLOWLIST === 'string'
      ? process.env.DEMO_ORG_ALLOWLIST
      : '';
  const allowlist = allowlistRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowlist.includes(orgId);
}

interface MeResponse {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  organizationId: string;
  departmentId: string | null;
  aiLevel: string;
  organizationName: string;
  leaderboardOptOut?: boolean;
}

/**
 * Read the authenticated user from the API. Pulls the access token from the
 * Supabase SSR cookie store and forwards it as a Bearer header — the API
 * does not share Supabase's cookie domain, so we cannot rely on cookies
 * propagating directly.
 *
 * In stub mode (no Supabase configured) reads the `sb-stub-auth-token` cookie
 * set by the client-side handleStubSignIn flow, so SSR can authenticate.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  let accessToken: string | undefined;

  if (!isSupabaseConfigured()) {
    // Stub mode reads the access token from EITHER an Authorization header
    // (set by e2e helpers via context.setExtraHTTPHeaders) OR the
    // sb-stub-auth-token cookie set by the sign-in form's localStorage
    // bridge. The header wins because it's a request-scoped credential
    // with no cookie-jar race against parallel navigations.
    const headerStore = await headers();
    const auth = headerStore.get('authorization') ?? headerStore.get('Authorization');
    if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
      accessToken = auth.slice('bearer '.length).trim();
    }
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      const cookieStore = await cookies();
      accessToken = cookieStore.get(STUB_COOKIE)?.value;
    }
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      return null;
    }
  } else {
    // Read the access token directly from the `sb-<ref>-auth-token` cookie.
    // We used to go through `supabase.auth.getSession()` here, but that path
    // races with @supabase/ssr's token-rotation `setAll` write inside server
    // components (which Next.js makes a no-op cookie store). On the second
    // render after sign-in the SDK returned a null session even with a valid
    // cookie present, and the (learn)/(admin) layout would bounce back to
    // /sign-in. Decoding the cookie ourselves avoids that read/write cycle.
    accessToken = await readSupabaseAccessTokenFromCookies();

    // Fallback: if the cookie format ever changes, let the SDK try.
    if (typeof accessToken !== 'string' || accessToken === '') {
      const supabase = await getSupabaseServerClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      accessToken = session?.access_token;
    }
  }

  // ---------------------------------------------------------------------------
  // Call /api/auth/me. We send BOTH a Bearer header (when we have a token) AND
  // forward the original Cookie header, because in concurrent-request flows
  // (router.push + router.refresh after sign-in) @supabase/ssr's middleware
  // can rotate the access_token between the in-flight request's cookie and
  // what we read here. The API guard accepts either credential — Authorization
  // header first, then `sb-<ref>-auth-token` cookie (auth.guard.ts:51-66) — so
  // forwarding the cookie gives us a fresh path even when our extracted token
  // is the stale pre-rotation value.
  // ---------------------------------------------------------------------------

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .filter(({ name }) => name.startsWith('sb-') || name === STUB_COOKIE)
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');

  if ((typeof accessToken !== 'string' || accessToken.length === 0) && cookieHeader === '') {
    return null;
  }

  try {
    const headers: Record<string, string> = {};
    if (typeof accessToken === 'string' && accessToken.length > 0) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (cookieHeader !== '') {
      headers.cookie = cookieHeader;
    }
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const me = (await response.json()) as MeResponse;
    return {
      id: me.id,
      userId: me.id,
      email: me.email,
      name: me.name,
      role: me.role,
      organizationId: me.organizationId,
      departmentId: me.departmentId,
      aiLevel: me.aiLevel,
      organizationName: me.organizationName,
      orgName: me.organizationName,
      leaderboardOptOut: me.leaderboardOptOut ?? false,
    };
  } catch {
    return null;
  }
}
