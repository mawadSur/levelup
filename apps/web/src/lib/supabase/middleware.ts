import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

export interface UpdateSessionResult {
  response: NextResponse;
  /** undefined when stub mode is active (no real Supabase project configured) */
  user: { id: string; email: string | undefined } | null;
}

/**
 * Refresh the Supabase session on every request and propagate the resulting
 * cookies to the downstream response. Returns the response object the caller
 * should return from middleware, plus the resolved user (or null).
 *
 * In stub mode (no real Supabase env) the middleware short-circuits — the
 * dev-bypass flow stores its access token in localStorage on the client side
 * rather than as a cookie, so middleware can't infer the user there. Pages
 * that need auth still call /api/auth/me which validates the JWT explicitly.
 */
export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  // Forward request headers explicitly. Middleware mutates request.headers
  // (e.g. x-pathname), but NextResponse.next({ request }) shorthand in
  // Next.js 15 does not propagate those mutations to downstream server
  // components. Without this, `headers().get('x-pathname')` in layouts
  // returns null and any fallback-driven redirect logic misfires. This
  // was the root cause of an infinite /assessment redirect loop for new
  // EMPLOYEE signups: (learn)/layout.tsx fell back to '/learn', the gate
  // didn't recognize /assessment, force-redirected to /assessment, repeat.
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (!isSupabaseConfigured()) {
    return { response, user: null };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set({ name, value, ...options });
        }
      },
    },
  });

  // getUser() forces a token refresh if the access token is expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    response,
    user: user
      ? {
          id: user.id,
          email: user.email ?? undefined,
        }
      : null,
  };
}
