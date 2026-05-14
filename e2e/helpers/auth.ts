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

  // Inject the stub cookie into the browser context so every page opened from
  // this context has the auth cookie on first navigation.
  //
  // We register the cookie twice — once scoped to the web origin (so SSR can
  // read it via next/headers cookies()) and once scoped to the API origin (so
  // direct browser→API calls send it too). Using `url` is more reliable than
  // `domain: 'localhost'`, which behaves inconsistently across Playwright
  // versions for bare-host localhost cookies.
  await context.addCookies([
    {
      name: STUB_COOKIE_NAME,
      value: accessToken,
      url: WEB_BASE,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: STUB_COOKIE_NAME,
      value: accessToken,
      url: API_BASE,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

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
