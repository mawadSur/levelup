/**
 * Real-auth sign-in helper for deployed (production / staging) tenants.
 *
 * Unlike `helpers/auth.ts`, this DOES NOT use the dev-bypass route — that
 * endpoint is intentionally disabled in production builds. Instead we drive
 * the real Supabase signInWithPassword form, the same way a human does.
 *
 * Demo users are provisioned by `scripts/seed-supabase-auth-users.ts`. The
 * same Supabase project backs both `kapitus` and `ceolawyer` tenants, so the
 * credentials are shared across the project matrix.
 */

import { expect, type Page } from '@playwright/test';

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'LevelUp!Demo1';

export const DEMO_USERS = {
  admin: 'admin@demo.test',
  manager: 'manager@demo.test',
  /**
   * `ed@demo.test` (PRACTITIONER) is preferred over `eve@demo.test`
   * (BEGINNER) for /learn tests: the (learn)/layout.tsx forces BEGINNER
   * employees with no assessment and no plan to /assessment, which masks
   * /learn coverage.
   */
  employee: 'ed@demo.test',
} as const;

/**
 * Fill and submit the deployed sign-in form. Mirrors the helper inlined in
 * `login.spec.ts` but exported so new specs do not re-implement it. The form
 * shape is identical across all three sign-in shells (default, kapitus,
 * ceolawyer): an email input, a password input, and a submit button.
 */
export async function signInDeployed(
  page: Page,
  email: string,
  password = DEMO_PASSWORD,
): Promise<void> {
  await page.goto('/sign-in');

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
  await emailInput.fill(email);

  const passwordInput = page.locator('input[type="password"]').first();
  await expect(passwordInput, 'password input must be present in real-auth mode').toBeVisible({
    timeout: 5_000,
  });
  await passwordInput.fill(password);

  const submit = page
    .locator('form button[type="submit"]')
    .filter({ hasText: /sign in|continue/i })
    .first();
  await submit.click();

  // The form must navigate off /sign-in. We surface the in-form banner if the
  // server rejected the credentials so the failure message is actionable.
  await page
    .waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 20_000 })
    .catch(async () => {
      const banner = page.locator('text=/we couldn.t sign you in|sign-in failed|invalid/i');
      const visible = await banner
        .first()
        .isVisible()
        .catch(() => false);
      if (visible) {
        const text = await banner.first().innerText();
        throw new Error(`Form rejected ${email}: ${text}`);
      }
      throw new Error(`Form did not navigate off /sign-in for ${email}. URL=${page.url()}`);
    });
}
