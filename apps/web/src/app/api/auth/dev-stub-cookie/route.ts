import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * E2E + dev-stub helper. Accepts `?token=<stub_access_token>` and writes it
 * to the `sb-stub-auth-token` cookie via Set-Cookie so the browser stores
 * it natively. Only available when Supabase is not configured (stub mode);
 * 404s in production.
 *
 * Used by e2e/helpers/auth.ts as a more reliable alternative to Playwright's
 * `context.addCookies()` — Set-Cookie on a real response is honoured by every
 * browser without origin/domain quirks.
 */
export async function GET(req: NextRequest) {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }
  const redirectTo = req.nextUrl.searchParams.get('redirect') ?? '/learn';
  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  response.cookies.set('sb-stub-auth-token', token, {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}
