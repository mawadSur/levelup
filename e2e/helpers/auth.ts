/**
 * Auth helpers for LevelUp AI Academy e2e tests.
 *
 * In stub mode (no Supabase configured) the API exposes:
 *   GET /api/auth/dev-bypass?email=...
 * which returns { accessToken, redirectTo } JSON.
 *
 * We inject `sb-stub-auth-token` cookie directly into the browser context so
 * both the web SSR layer and the API guard can authenticate the request without
 * going through the sign-in page.
 */

import type { BrowserContext, Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:4000';
const WEB_BASE = process.env.E2E_WEB_URL ?? 'http://localhost:3000';

export const STUB_COOKIE_NAME = 'sb-stub-auth-token';

// ---------------------------------------------------------------------------
// Seeded test users (from packages/db/prisma/seed.ts)
// ---------------------------------------------------------------------------
export const SEEDED_USERS = {
  admin: 'admin@demo.test',
  manager: 'manager@demo.test',
  employee: 'eve@demo.test',
  employee2: 'ed@demo.test',
} as const;

// ---------------------------------------------------------------------------
// signInViaDevBypass
//
// Fetches a stub access token from the API and injects it into the browser
// context as `sb-stub-auth-token`. The SSR layer reads this cookie to
// authenticate server-rendered pages without needing a Supabase session.
//
// Accepts a BrowserContext; returns the first page in that context (creating
// one if needed). The page is NOT yet navigated — callers control where to go.
// ---------------------------------------------------------------------------
export async function signInViaDevBypass(context: BrowserContext, email: string): Promise<Page> {
  const devBypassUrl = `${API_BASE}/api/auth/dev-bypass?email=${encodeURIComponent(email)}`;
  const res = await fetch(devBypassUrl);
  if (!res.ok) {
    throw new Error(`dev-bypass failed for ${email}: ${res.status} ${res.statusText}`);
  }
  const { accessToken } = (await res.json()) as { accessToken: string; redirectTo: string };

  // Install auth via THREE complementary mechanisms so SSR sees the user on
  // first navigation regardless of cookie-jar timing:
  //
  // 1. setExtraHTTPHeaders — attaches Authorization: Bearer to every request
  //    in this context. Web SSR + API auth.guard both recognise it. This
  //    is the authoritative signal under parallel load (request-scoped, no
  //    cookie races).
  // 2. addCookies — keeps getSessionCookie() working for tests that still
  //    extract the raw token from the cookie jar.
  // 3. dev-stub-cookie route — kept for tests that exercise the cookie path
  //    end-to-end (the sign-in form bridge).
  await context.setExtraHTTPHeaders({ Authorization: `Bearer ${accessToken}` });
  await context.addCookies([
    {
      name: STUB_COOKIE_NAME,
      value: accessToken,
      url: WEB_BASE,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  await context.request.get(
    `${WEB_BASE}/api/auth/dev-stub-cookie?token=${encodeURIComponent(accessToken)}`,
  );
  const pages = context.pages();
  return pages.length > 0 ? (pages[0] as Page) : await context.newPage();
}

// ---------------------------------------------------------------------------
// getSessionCookie
//
// Returns the raw value of the sb-stub-auth-token cookie from the browser
// context after a successful sign-in.
// ---------------------------------------------------------------------------
export async function getSessionCookie(context: BrowserContext): Promise<string | null> {
  const allCookies = await context.cookies();
  const sessionCookie = allCookies.find((c) => c.name === STUB_COOKIE_NAME);
  return sessionCookie?.value ?? null;
}

// ---------------------------------------------------------------------------
// signInAsAdmin / signInAsEmployee
//
// Convenience wrappers over the seeded demo users.
// ---------------------------------------------------------------------------
export async function signInAsAdmin(context: BrowserContext): Promise<Page> {
  return signInViaDevBypass(context, SEEDED_USERS.admin);
}

export async function signInAsEmployee(context: BrowserContext): Promise<Page> {
  return signInViaDevBypass(context, SEEDED_USERS.employee);
}

// ---------------------------------------------------------------------------
// expectSignedIn
//
// Asserts that the current page URL indicates a successful login.
// ---------------------------------------------------------------------------
export async function expectSignedIn(page: Page): Promise<void> {
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/learn') ||
      url.pathname.startsWith('/coach'),
    { timeout: 15_000 },
  );
}

// ---------------------------------------------------------------------------
// navigateToWebPage
//
// Navigate to any web page from within a context that already has auth cookies.
// ---------------------------------------------------------------------------
export async function navigateToWebPage(page: Page, path: string): Promise<void> {
  await page.goto(`${WEB_BASE}${path}`, { waitUntil: 'networkidle' });
}
