/**
 * Playwright test fixtures for LevelUp AI Academy e2e suite.
 *
 * Extends the base `test` object with:
 *   - adminPage      — a Page already authenticated as admin@demo.test
 *   - employeePage   — a Page already authenticated as eve@demo.test
 *   - adminCookie    — raw sb-stub-auth-token value for the admin session
 *   - employeeCookie — raw sb-stub-auth-token value for the employee session
 *
 * Authentication is done by injecting `sb-stub-auth-token` directly into the
 * browser context via the API dev-bypass endpoint — no UI sign-in flow needed.
 * The DB must be seeded (`pnpm db:seed`) before running tests.
 */

import { test as baseTest, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import { signInViaDevBypass, getSessionCookie, SEEDED_USERS } from '../helpers/auth';

const WEB_BASE = process.env.E2E_WEB_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Fixture type definitions
// ---------------------------------------------------------------------------

interface LevelUpFixtures {
  /** Page signed in as the demo admin (admin@demo.test). */
  adminPage: Page;
  /** Page signed in as the demo employee (eve@demo.test). */
  employeePage: Page;
  /** Raw sb-stub-auth-token cookie for the admin session. */
  adminCookie: string;
  /** Raw sb-stub-auth-token cookie for the employee session. */
  employeeCookie: string;
  /** Browser context used for the admin session (for cookie extraction). */
  adminContext: BrowserContext;
  /** Browser context used for the employee session (for cookie extraction). */
  employeeContext: BrowserContext;
}

// ---------------------------------------------------------------------------
// Extended test
// ---------------------------------------------------------------------------

export const test = baseTest.extend<LevelUpFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },

  employeeContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },

  adminPage: async ({ adminContext }, use) => {
    // signInViaDevBypass navigates to the dev-stub-cookie route which sets
    // sb-stub-auth-token via Set-Cookie. The page returned by the helper
    // already has the cookie; we navigate it to /admin.
    const page = await signInViaDevBypass(adminContext, SEEDED_USERS.admin);
    await page.goto(`${WEB_BASE}/admin`, { waitUntil: 'networkidle' });
    await use(page);
    await page.close();
  },

  employeePage: async ({ employeeContext }, use) => {
    const page = await signInViaDevBypass(employeeContext, SEEDED_USERS.employee);
    await page.goto(`${WEB_BASE}/learn`, { waitUntil: 'networkidle' });
    await use(page);
    await page.close();
  },

  adminCookie: async ({ adminContext, adminPage: _ }, use) => {
    // adminPage fixture already authenticated — extract cookie from the context.
    const cookie = await getSessionCookie(adminContext);
    if (!cookie) {
      throw new Error(
        '[fixture] adminCookie: sb-stub-auth-token not found after sign-in. ' +
          'Is stub mode active? (SUPABASE_URL/SUPABASE_ANON_KEY should be PLACEHOLDER_ or missing)',
      );
    }
    await use(cookie);
  },

  employeeCookie: async ({ employeeContext, employeePage: _ }, use) => {
    const cookie = await getSessionCookie(employeeContext);
    if (!cookie) {
      throw new Error('[fixture] employeeCookie: sb-stub-auth-token not found after sign-in.');
    }
    await use(cookie);
  },
});

export { expect };
