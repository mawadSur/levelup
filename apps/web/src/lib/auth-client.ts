import 'server-only';
import { cookies } from 'next/headers';
import { getSupabaseServerClient, isSupabaseConfigured } from './supabase/server';

const STUB_COOKIE = 'sb-stub-auth-token';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? '' : 'http://localhost:4000');

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
    const cookieStore = await cookies();
    const stubToken = cookieStore.get(STUB_COOKIE)?.value;
    if (typeof stubToken !== 'string' || stubToken.length === 0) {
      return null;
    }
    accessToken = stubToken;
  } else {
    const supabase = await getSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    accessToken = session?.access_token;
  }

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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
