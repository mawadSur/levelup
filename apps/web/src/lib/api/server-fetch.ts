import 'server-only';
import { cookies, headers } from 'next/headers';
import { getSupabaseServerClient, isSupabaseConfigured } from '../supabase/server';
import { apiFetch } from './client';

const STUB_COOKIE = 'sb-stub-auth-token';

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
 * Decode the access token out of an `sb-<ref>-auth-token` cookie value, the
 * same way `lib/auth-client.ts` does. Kept in lock-step because both files
 * read the same cookie set.
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

async function readCookieHeaderForApi(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .filter(({ name }) => name.startsWith('sb-') || name === STUB_COOKIE)
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}

/**
 * Server-only fetch helper for server components and route handlers.
 *
 * The API is hosted on a different origin from the web app, so the user's
 * Supabase cookies don't propagate to its requests automatically. We mirror
 * what `getSessionUser` does: read the access token from the Supabase SSR
 * session and forward it as a Bearer header. Without this, every server-
 * side API call returns 401 and pages render empty/"unavailable" states.
 *
 * In stub mode reads `sb-stub-auth-token` cookie and forwards it as Bearer.
 *
 * Kept in its own file (instead of inside the shared `client.ts`) so the
 * `'server-only'` import chain never reaches a `'use client'` component
 * through the api index. Server components import `ssrGet`/`ssrPost` from
 * here directly.
 */
async function serverAuthHeader(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) {
    try {
      // Prefer Authorization header (e2e helpers + future API-token clients)
      // over the stub cookie — the header is request-scoped so it can't lose
      // to a cookie-jar race under parallel page navigations.
      const headerStore = await headers();
      const auth = headerStore.get('authorization') ?? headerStore.get('Authorization');
      if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
        const tokenFromHeader = auth.slice('bearer '.length).trim();
        if (tokenFromHeader.length > 0) {
          return { Authorization: `Bearer ${tokenFromHeader}` };
        }
      }
      const cookieStore = await cookies();
      const token = cookieStore.get(STUB_COOKIE)?.value;
      return typeof token === 'string' && token.length > 0
        ? { Authorization: `Bearer ${token}` }
        : {};
    } catch {
      return {};
    }
  }
  // Real Supabase: mirror what auth-client.ts does. Decode the cookie ourselves
  // (avoids the @supabase/ssr server-component cookie-rotation race) AND
  // forward the original Cookie header, so the API can fall back to its own
  // cookie reassembly if our extracted token is stale.
  try {
    const headers: Record<string, string> = {};
    const token = await readSupabaseAccessTokenFromCookies();
    if (typeof token === 'string' && token.length > 0) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      // Fallback: ask the SDK. Almost never runs after the cookie-decode fix
      // ships, but kept as a safety net for future cookie-format changes.
      const supabase = await getSupabaseServerClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const sdkToken = session?.access_token;
      if (typeof sdkToken === 'string' && sdkToken.length > 0) {
        headers.Authorization = `Bearer ${sdkToken}`;
      }
    }
    const cookieHeader = await readCookieHeaderForApi();
    if (cookieHeader !== '') {
      headers.cookie = cookieHeader;
    }
    return headers;
  } catch {
    return {};
  }
}

export async function ssrFetch<T = unknown>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const auth = await serverAuthHeader();
  return apiFetch<T>(path, {
    ...init,
    headers: { ...auth, ...init?.headers },
  });
}

export async function ssrGet<T = unknown>(path: string): Promise<T> {
  return ssrFetch<T>(path, { method: 'GET' });
}

export async function ssrPost<TBody = unknown, TResponse = unknown>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  return ssrFetch<TResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
