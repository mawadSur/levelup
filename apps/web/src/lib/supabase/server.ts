import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieOptions } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL !== '' &&
    SUPABASE_ANON_KEY !== '' &&
    !SUPABASE_URL.startsWith('PLACEHOLDER_') &&
    !SUPABASE_ANON_KEY.startsWith('PLACEHOLDER_')
  );
}

/** Minimal stub that callers can use when Supabase is not configured. */
const supabaseStub = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
  },
} as const;

type SupabaseStub = typeof supabaseStub;
type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Returns a Supabase client bound to the current request's cookie jar. The
 * server side reads/writes session cookies through the Next.js `cookies()`
 * helper; @supabase/ssr handles refresh-token rotation on its own.
 *
 * In stub mode (PLACEHOLDER_ URLs) returns a no-op stub so callers don't
 * throw on invalid Supabase URLs.
 *
 * Use from server components and route handlers.
 */
export async function getSupabaseServerClient(): Promise<SupabaseServerClient | SupabaseStub> {
  if (!isSupabaseConfigured()) {
    return supabaseStub;
  }

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        // In server components Next throws if you call set(); the supabase
        // SDK invokes setAll on token refresh. Swallow the error — the
        // middleware (which runs on every request) is the canonical place
        // to refresh and write cookies. Server components only read.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set({ name, value, ...(options as CookieOptions) });
          }
        } catch {
          // ignore — see comment above
        }
      },
    },
  });
}
