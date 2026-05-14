/**
 * 01 — Marketing page & authentication flow
 *
 * Tests:
 *   1. Marketing home page renders with the expected hero H1.
 *   2. "Sign in" link navigates to /sign-in.
 *   3. Sign-in form accepts an email and triggers the dev-bypass redirect.
 *   4. After dev-bypass the user lands on /admin (admin role).
 *   5. GET /api/auth/me returns the expected user.
 *
 * All tests run in stub mode — no real WorkOS keys needed.
 */

import { test, expect } from '../fixtures/test-fixtures';
import { SEEDED_USERS, signInViaDevBypass } from '../helpers/auth';
import { getMe } from '../helpers/api';

// ---------------------------------------------------------------------------
// 1. Marketing home page
// ---------------------------------------------------------------------------

test.describe('Marketing home page', () => {
  test('renders hero H1 containing "Train every employee"', async ({ page }) => {
    await page.goto('/');
    // The Hero component renders:
    //   <h1>Train every employee to use AI safely, effectively, and measurably.</h1>
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Train every employee');
  });

  test('"Sign in" link in nav navigates to /sign-in', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).click();
    await page.waitForURL('**/sign-in**');
    expect(page.url()).toContain('/sign-in');
  });
});

// ---------------------------------------------------------------------------
// 2. Sign-in form → dev-bypass redirect
// ---------------------------------------------------------------------------

test.describe('Sign-in form (stub mode)', () => {
  test('filling email and clicking Continue redirects through dev-bypass to /admin for admin user', async ({
    page,
  }) => {
    await page.goto('/sign-in');

    // Fill the email field
    await page.getByLabel(/work email/i).fill(SEEDED_USERS.admin);

    // The form's Continue button submits and navigates away.
    // We wait for the redirect to settle — the dev-bypass sets the session
    // cookie and redirects to /admin for ADMIN-role users.
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith('/admin'), {
        timeout: 20_000,
      }),
      page.getByRole('button', { name: /continue/i }).click(),
    ]);

    expect(page.url()).toContain('/admin');
  });

  test('filling employee email redirects to /learn', async ({ page }) => {
    await page.goto('/sign-in');

    await page.getByLabel(/work email/i).fill(SEEDED_USERS.employee);
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith('/learn'), {
        timeout: 20_000,
      }),
      page.getByRole('button', { name: /continue/i }).click(),
    ]);

    expect(page.url()).toContain('/learn');
  });
});

// ---------------------------------------------------------------------------
// 3. /api/auth/me returns the signed-in user
// ---------------------------------------------------------------------------

test.describe('/auth/me API endpoint', () => {
  test('returns the admin user after signing in', async ({ adminPage, adminCookie }) => {
    // adminPage fixture already signed in. We now call /api/auth/me directly.
    void adminPage; // fixture ensures the session cookie is set in the context

    const me = await getMe(adminCookie);

    expect(me.email).toBe(SEEDED_USERS.admin);
    expect(me.role).toBe('ADMIN');
    expect(me.name).toBeTruthy();
    expect(me.organizationId).toBeTruthy();
  });

  test('returns the employee user after signing in', async ({ employeePage, employeeCookie }) => {
    void employeePage;

    const me = await getMe(employeeCookie);

    expect(me.email).toBe(SEEDED_USERS.employee);
    expect(me.role).toBe('EMPLOYEE');
  });
});

// ---------------------------------------------------------------------------
// 4. Programmatic dev-bypass helper
// ---------------------------------------------------------------------------

test.describe('Dev-bypass auth helper', () => {
  test('signInViaDevBypass seeds cookie and /admin loads for admin user', async ({ browser }) => {
    const ctx = await browser.newContext();
    try {
      await signInViaDevBypass(ctx, SEEDED_USERS.admin);
      const page = await ctx.newPage();
      await page.goto('/admin', { waitUntil: 'networkidle' });
      expect(page.url()).toContain('/admin');
      await page.close();
    } finally {
      await ctx.close();
    }
  });

  test('signInViaDevBypass seeds cookie and /learn loads for employee user', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    try {
      await signInViaDevBypass(ctx, SEEDED_USERS.employee);
      const page = await ctx.newPage();
      await page.goto('/learn', { waitUntil: 'networkidle' });
      expect(page.url()).toContain('/learn');
      await page.close();
    } finally {
      await ctx.close();
    }
  });
});
