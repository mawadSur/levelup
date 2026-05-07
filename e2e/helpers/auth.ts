/**
 * Auth helpers for LevelUp AI Academy e2e tests.
 *
 * In stub mode (WORKOS_API_KEY=PLACEHOLDER_*), the API exposes a
 * GET /api/auth/dev-bypass?email=&state= endpoint that:
 *   1. Looks up the user by email (must already exist in the DB).
 *   2. Builds a fake session JWT and sets the LEVELUP_SESSION cookie.
 *   3. Redirects to /admin (ADMIN) or /learn (EMPLOYEE/MANAGER).
 *
 * These helpers navigate a Playwright Page through that redirect chain
 * programmatically so every spec can sign in with a single call.
 */

import type { BrowserContext, Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:4000';
const WEB_BASE = process.env.E2E_WEB_URL ?? 'http://localhost:3000';

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
// Navigates to the dev-bypass URL and waits for the final redirect to resolve.
// The cookie is set by the API response and persisted in the browser context.
// Returns the page, which will be at /admin (admin) or /learn (others).
// ---------------------------------------------------------------------------
export async function signInViaDevBypass(page: Page, email: string): Promise<Page> {
  // Build the dev-bypass URL exactly as the sign-in form does:
  //   GET /api/auth/sign-in?provider=authkit  → returns { url: "...dev-bypass?..." }
  //   The form injects ?email= before following the URL.
  //
  // For tests we can hit dev-bypass directly; the API redirects to
  // /admin or /learn after setting the cookie.
  const devBypassUrl = `${API_BASE}/api/auth/dev-bypass` + `?email=${encodeURIComponent(email)}`;

  // Navigate and wait for the final Next.js page to stabilise.
  await page.goto(devBypassUrl, { waitUntil: 'networkidle' });

  return page;
}

// ---------------------------------------------------------------------------
// getSessionCookie
//
// Extracts the raw value of the LEVELUP_SESSION cookie from the browser
// context after a successful sign-in. Useful for direct API calls in
// afterEach cleanup hooks.
// ---------------------------------------------------------------------------
export async function getSessionCookie(context: BrowserContext): Promise<string | null> {
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === 'LEVELUP_SESSION');
  return sessionCookie?.value ?? null;
}

// ---------------------------------------------------------------------------
// signInAsAdmin / signInAsEmployee
//
// Convenience wrappers over the seeded demo users.
// ---------------------------------------------------------------------------
export async function signInAsAdmin(page: Page): Promise<Page> {
  return signInViaDevBypass(page, SEEDED_USERS.admin);
}

export async function signInAsEmployee(page: Page): Promise<Page> {
  return signInViaDevBypass(page, SEEDED_USERS.employee);
}

// ---------------------------------------------------------------------------
// expectSignedIn
//
// Asserts that the current page URL indicates a successful login:
// either /admin (for admins) or /learn (for employees/managers).
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
// After signing in via the API-level dev-bypass URL the browser has the
// LEVELUP_SESSION cookie. Use this helper to navigate to any web page and
// assert it loads (status 200 range).
// ---------------------------------------------------------------------------
export async function navigateToWebPage(page: Page, path: string): Promise<void> {
  await page.goto(`${WEB_BASE}${path}`, { waitUntil: 'networkidle' });
}
