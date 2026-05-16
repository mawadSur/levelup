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

// i18n (CR.38) — locales must match next.config.mjs `i18n.locales` and the
// keys in `apps/web/messages/`. Kept in sync via `SUPPORTED_LOCALES` in
// src/lib/i18n.ts (which is the runtime source of truth for the helper).
// We accept a `?locale=xx` query param and persist it as `levelup-locale`
// cookie so subsequent navigations stay on the chosen language. The cookie
// shares the LEVELUP_SESSION middleware so the locale + auth concerns stay
// in one place.
const SUPPORTED_LOCALE_SET = new Set(['en', 'es', 'fr', 'pt']);
const LOCALE_COOKIE = 'levelup-locale';
const LOCALE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

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

  // Locale persistence (CR.38). If the request carries `?locale=xx` with a
  // supported value, write the cookie so getLocale()/getTranslations() pick
  // it up on this and subsequent requests. We do this BEFORE the auth
  // redirect so the locale survives the bounce through /sign-in.
  const localeParam = request.nextUrl.searchParams.get('locale');
  if (localeParam !== null && SUPPORTED_LOCALE_SET.has(localeParam)) {
    response.cookies.set({
      name: LOCALE_COOKIE,
      value: localeParam,
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE_SEC,
      sameSite: 'lax',
    });
  }

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
