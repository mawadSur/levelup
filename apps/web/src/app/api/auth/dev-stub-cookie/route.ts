import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * E2E + dev-stub helper. Accepts `?token=<stub_access_token>` and writes it
 * to the `sb-stub-auth-token` cookie via Set-Cookie so the browser stores
 * it natively. Only available when Supabase is not configured (stub mode);
 * 404s in production.
 *
 * Returns 200 (not a redirect) so the cookie set by this response is the
 * final response Playwright sees — there's no redirect chain that could
 * lose the Set-Cookie on the way to a final page.
 */
export async function GET(req: NextRequest) {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set('sb-stub-auth-token', token, {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}
