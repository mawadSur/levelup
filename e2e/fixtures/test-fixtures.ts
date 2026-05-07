/**
 * Playwright test fixtures for LevelUp AI Academy e2e suite.
 *
 * Extends the base `test` object with:
 *   - adminPage     — a Page already signed in as admin@demo.test
 *   - employeePage  — a Page already signed in as eve@demo.test
 *   - adminCookie   — raw LEVELUP_SESSION cookie value for the admin session
 *   - employeeCookie — raw LEVELUP_SESSION cookie value for the employee session
 *
 * All fixtures use the seeded demo users, so no per-test org/user creation is
 * required. The DB must be seeded (`pnpm db:seed`) before running tests.
 */

import { test as baseTest, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import { signInViaDevBypass, getSessionCookie, SEEDED_USERS } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Fixture type definitions
// ---------------------------------------------------------------------------

interface LevelUpFixtures {
  /** Page signed in as the demo admin (admin@demo.test). */
  adminPage: Page;
  /** Page signed in as the demo employee (eve@demo.test). */
  employeePage: Page;
  /** Raw LEVELUP_SESSION cookie for the admin session. */
  adminCookie: string;
  /** Raw LEVELUP_SESSION cookie for the employee session. */
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
    const page = await adminContext.newPage();
    await signInViaDevBypass(page, SEEDED_USERS.admin);
    await use(page);
    await page.close();
  },

  employeePage: async ({ employeeContext }, use) => {
    const page = await employeeContext.newPage();
    await signInViaDevBypass(page, SEEDED_USERS.employee);
    await use(page);
    await page.close();
  },

  adminCookie: async ({ adminContext, adminPage: _ }, use) => {
    // adminPage fixture already signed in — extract cookie from the context.
    const cookie = await getSessionCookie(adminContext);
    if (!cookie) {
      throw new Error(
        '[fixture] adminCookie: LEVELUP_SESSION not found after sign-in. ' +
          'Is stub mode active? (WORKOS_API_KEY should start with PLACEHOLDER_)',
      );
    }
    await use(cookie);
  },

  employeeCookie: async ({ employeeContext, employeePage: _ }, use) => {
    const cookie = await getSessionCookie(employeeContext);
    if (!cookie) {
      throw new Error('[fixture] employeeCookie: LEVELUP_SESSION not found after sign-in.');
    }
    await use(cookie);
  },
});

export { expect };
