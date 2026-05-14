import 'server-only';
import { cookies } from 'next/headers';
import { getSupabaseServerClient, isSupabaseConfigured } from '../supabase/server';
import { apiFetch } from './client';

const STUB_COOKIE = 'sb-stub-auth-token';

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
      const cookieStore = await cookies();
      const token = cookieStore.get(STUB_COOKIE)?.value;
      return typeof token === 'string' && token.length > 0
        ? { Authorization: `Bearer ${token}` }
        : {};
    } catch {
      return {};
    }
  }
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return typeof token === 'string' && token.length > 0
      ? { Authorization: `Bearer ${token}` }
      : {};
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
