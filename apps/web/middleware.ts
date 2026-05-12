import { type NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PATTERNS = [
  /^\/admin(\/.*)?$/,
  /^\/learn(\/.*)?$/,
  /^\/profile(\/.*)?$/,
  /^\/team(\/.*)?$/,
  /^\/coach(\/.*)?$/,
  /^\/assessment(\/.*)?$/,
  /^\/curriculum(\/.*)?$/,
  /^\/playbooks(\/.*)?$/,
  /^\/leaderboard(\/.*)?$/,
  /^\/prompts(\/.*)?$/,
  /^\/privacy(\/.*)?$/,
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATTERNS.some((p) => p.test(pathname));
}

/**
 * Run the Supabase SSR session refresh on every request, then redirect
 * unauthenticated visits to protected paths back to /sign-in.
 *
 * In stub mode (no Supabase env) we cannot inspect the user from cookies —
 * the dev-bypass flow stores its access token in localStorage. We let the
 * request through; the page's server component will call /api/auth/me with
 * the Bearer token if the client attaches one, and the API will 401 if not.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Expose the current pathname to server components (e.g. (learn)/layout.tsx
  // uses it to preserve the deep-link target on the sign-in redirect).
  request.headers.set('x-pathname', pathname);
  const { response, user } = await updateSession(request);
  response.headers.set('x-pathname', pathname);

  if (!isProtected(pathname)) {
    return response;
  }

  if (!isSupabaseConfigured()) {
    // Stub mode: skip the cookie-based redirect; let the page render and
    // surface auth errors via the API client.
    return response;
  }

  if (user === null) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.svg|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
