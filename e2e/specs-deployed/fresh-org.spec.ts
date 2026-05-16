/**
 * Deployed regression — sign-up happy path for a brand-new visitor.
 *
 * Generates a unique email per run (`e2e-freshorg-${Date.now()}@example.test`)
 * and walks the /sign-up form. We assert two things:
 *   1. The form submits and navigates off /sign-up.
 *   2. The landing route after sign-up is not a 4xx/5xx error page.
 *
 * Three sign-up shells exist (selected by tenant CLIENT env on the server):
 *   - default / ailevel.app — single "Full name" field, no department.
 *   - kapitus.com — full name, email, password, REQUIRED department select,
 *     role select.
 *   - ceolawyer.com — same shape as kapitus.
 *
 * We use stable selectors that work across all three:
 *   - Email:      input[type="email"]
 *   - Password:   input[type="password"]
 *   - Submit:     button[type="submit"] (filtered to the create/enroll text)
 *   - Org name:   id="org-name" (default-only — kapitus/ceolawyer infer it)
 *   - Full name:  id="admin-name" OR id="kp-full-name" OR id="cl-full-name"
 *                 — we try each in order and fill whichever exists.
 *   - Department: id="kp-department" / id="cl-department" (only on tenants)
 *
 * Cleanup:
 *   There is no self-serve "delete org" route in the public API today and
 *   adding one is out of scope for this lane. Test orgs WILL persist in the
 *   Supabase + Postgres state and accumulate one row per run, per tenant.
 *
 *   Mitigations:
 *     - The unique email pattern (`e2e-freshorg-*@example.test`) makes it
 *       trivial to write a one-shot prune job later:
 *         DELETE FROM "Organization" WHERE name LIKE 'E2E Test Org %';
 *         DELETE FROM "User" WHERE email LIKE 'e2e-freshorg-%@example.test';
 *       paired with the matching Supabase auth.users entries.
 *     - We do NOT send invitations from these orgs, so no email noise.
 *     - The trial-expiry worker will archive these orgs at day 21 anyway.
 *
 *   If a `/api/admin/test-cleanup` route ships later (Lane 1 territory),
 *   wire it into `test.afterEach` here.
 *
 * Skip conditions:
 *   - The tenant page may have an unrecognised sign-up shell (e.g. a future
 *     client adds extra required fields). We try to fill the shape we know;
 *     if a required field we can't find blocks submission, `test.skip` rather
 *     than blast through and create garbage data.
 */
import { test, expect, type Page } from '@playwright/test';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'LevelUp!Demo1';

interface Filled {
  filledEmail: boolean;
  filledPassword: boolean;
  filledFullName: boolean;
  filledOrgName: boolean;
  filledDepartment: boolean;
  /** Selectors we couldn't find — used to soft-skip on unknown shells. */
  missing: string[];
}

async function fillIfPresent(
  page: Page,
  selector: string,
  value: string,
  /**
   * Some inputs (selects) need .selectOption. Most use .fill. The fallback
   * tries fill first and selectOption if fill is rejected (it's a select).
   */
  isSelect = false,
): Promise<boolean> {
  const el = page.locator(selector).first();
  if (!(await el.count())) return false;
  if (!(await el.isVisible().catch(() => false))) return false;
  try {
    if (isSelect) {
      await el.selectOption({ label: value }).catch(async () => {
        // Fall back to selecting by value if the label isn't an exact match.
        await el.selectOption(value);
      });
    } else {
      await el.fill(value);
    }
    return true;
  } catch {
    return false;
  }
}

async function fillSignUpForm(page: Page, unique: string): Promise<Filled> {
  const result: Filled = {
    filledEmail: false,
    filledPassword: false,
    filledFullName: false,
    filledOrgName: false,
    filledDepartment: false,
    missing: [],
  };

  // Email — same selector across all three shells.
  result.filledEmail = await fillIfPresent(
    page,
    'input[type="email"]',
    `e2e-freshorg-${unique}@example.test`,
  );
  if (!result.filledEmail) result.missing.push('input[type="email"]');

  // Password.
  result.filledPassword = await fillIfPresent(page, 'input[type="password"]', DEMO_PASSWORD);
  if (!result.filledPassword) result.missing.push('input[type="password"]');

  // Full name — try the default shell first, then kapitus, then ceolawyer.
  for (const sel of ['#admin-name', '#kp-full-name', '#cl-full-name']) {
    if (await fillIfPresent(page, sel, 'E2E Test')) {
      result.filledFullName = true;
      break;
    }
  }
  if (!result.filledFullName) {
    // Generic fallback: any text input with name/autocomplete=name.
    result.filledFullName = await fillIfPresent(page, 'input[autocomplete="name"]', 'E2E Test');
  }
  if (!result.filledFullName) result.missing.push('full-name input');

  // Org name — only present on the default shell. Kapitus / ceolawyer hardcode
  // the org server-side, so the field doesn't exist.
  const orgNameLocator = page.locator('#org-name').first();
  if (await orgNameLocator.count()) {
    result.filledOrgName = await fillIfPresent(page, '#org-name', `E2E Test Org ${unique}`);
  } else {
    result.filledOrgName = true; // n/a on this tenant
  }

  // Department select — required on kapitus + ceolawyer, absent on default.
  for (const sel of ['#kp-department', '#cl-department']) {
    if (await page.locator(sel).count()) {
      // Pick any non-empty option. "Operations" exists in both lists.
      const ok = await fillIfPresent(page, sel, 'Operations', true);
      result.filledDepartment = ok;
      if (!ok) result.missing.push(sel);
      break;
    }
  }
  if (!result.filledDepartment && result.missing.length === 0) {
    result.filledDepartment = true; // n/a on this tenant
  }

  return result;
}

test.describe('Deployed fresh-org sign-up happy path', () => {
  test('a new visitor signs up, navigates off /sign-up, lands on a logged-in surface', async ({
    page,
  }, testInfo) => {
    const unique = `${Date.now()}-${testInfo.workerIndex}`;
    const expectedEmail = `e2e-freshorg-${unique}@example.test`;

    // ---- 1. /sign-up loads --------------------------------------------------
    await page.goto('/sign-up', { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('input[type="email"]').first(),
      '/sign-up must render an email input',
    ).toBeVisible({ timeout: 15_000 });

    // ---- 2. Fill the form ---------------------------------------------------
    const filled = await fillSignUpForm(page, unique);

    test.skip(
      !filled.filledEmail || !filled.filledPassword,
      `Sign-up form on ${page.url()} is missing email/password — unrecognised shell. ` +
        `Missing: ${JSON.stringify(filled.missing)}`,
    );

    // ---- 3. Submit ----------------------------------------------------------
    // All three shells use a form[submit] button. Default shell labels it
    // "CREATE ORGANIZATION →"; kapitus labels it "Enroll"; ceolawyer labels
    // it "Get started". Match all three; fall back to the first submit
    // button in the form on any future shell that diverges again.
    let submit = page
      .locator('form button[type="submit"]')
      .filter({ hasText: /create organization|enroll|create account|sign up|get started|begin/i })
      .first();
    if (!(await submit.count())) {
      submit = page.locator('form button[type="submit"]').first();
    }
    await expect(submit, 'submit button must render on /sign-up').toBeVisible({
      timeout: 5_000,
    });

    // Capture pageerror so we can surface a useful diagnostic on failure.
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await submit.click();

    // ---- 4. Form must navigate off /sign-up --------------------------------
    // Two valid outcomes:
    //   a) The Supabase signUp succeeded and the form pushes to
    //      `${signInUrl}` (which is `/sign-in?email=...&orgId=...`). For
    //      kapitus/ceolawyer it's `${kRoutes.signIn}?...` (still /sign-in).
    //   b) Stub mode (unlikely on prod) pushes straight to /admin or /learn.
    //
    // Both are off /sign-up, which is the only signal we strictly need to
    // assert "the form's submit pipeline didn't crash."
    await page
      .waitForURL((url) => !url.pathname.startsWith('/sign-up'), { timeout: 20_000 })
      .catch(async () => {
        // Surface the in-form error banner if Supabase rejected the signup.
        const banner = page
          .locator(
            'text=/PROVISIONING FAILED|couldn.t enroll|sign-up failed|already exists|already registered/i',
          )
          .first();
        const visible = await banner.isVisible().catch(() => false);
        if (visible) {
          const text = await banner.innerText();
          throw new Error(
            `Sign-up form rejected ${expectedEmail}: "${text}". pageErrors=${JSON.stringify(pageErrors).slice(0, 400)}`,
          );
        }
        throw new Error(
          `Form did not navigate off /sign-up for ${expectedEmail}. ` +
            `url=${page.url()} filled=${JSON.stringify(filled)} ` +
            `pageErrors=${JSON.stringify(pageErrors).slice(0, 400)}`,
        );
      });

    // ---- 5. Where did we land? ----------------------------------------------
    // We accept any of:
    //   - /sign-in?... (the API's signInUrl — most common because Supabase
    //     requires email confirmation in real mode, so the form punts back
    //     to sign-in and the user has to confirm before they can land).
    //   - /assessment/* (BEGINNER auto-redirect from (learn)/layout.tsx)
    //   - /learn (PRACTITIONER+ or stubbed sign-in flow)
    //   - /admin (admin auto-bypass — unlikely without email confirmation)
    //
    // We do NOT try to confirm the email — that would require IMAP access
    // and is well out of scope for an idempotent deployed smoke test.
    const finalUrl = new URL(page.url());
    const acceptable =
      /^\/sign-in/.test(finalUrl.pathname) ||
      /^\/assessment/.test(finalUrl.pathname) ||
      /^\/learn/.test(finalUrl.pathname) ||
      /^\/admin/.test(finalUrl.pathname) ||
      // Some tenants redirect to a localized welcome page after sign-up.
      /^\/(en|es|fr|de)\/sign-in/.test(finalUrl.pathname);

    expect(
      acceptable,
      `After sign-up, the user must land on a known route. Got ${finalUrl.pathname}. ` +
        `filled=${JSON.stringify(filled)} pageErrors=${JSON.stringify(pageErrors).slice(0, 400)}`,
    ).toBeTruthy();

    // ---- 6. The landing page must not be an error page ----------------------
    // Cheap sanity check: the document has a <body> with some content and
    // doesn't surface a 4xx/5xx error fallback.
    const errorHero = page
      .getByText(/something went wrong|500 — server|404 — not found|application error/i)
      .first();
    expect(
      await errorHero.isVisible().catch(() => false),
      `Landing page after sign-up should not render an error fallback. url=${page.url()}`,
    ).toBeFalsy();
  });
});
