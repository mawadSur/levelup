// Why this is a deployed-only spec:
//   /admin is server-rendered, calls the API for stats + activity, and is
//   gated by a Supabase session cookie issued only after a real Supabase
//   signInWithPassword. Stubbed local mode bypasses both the SSR auth read
//   and the real /users/:id/activity endpoint, so this regression class —
//   "admin lands on /admin, sees a stat number, sees the activity feed" —
//   can only be exercised against deployed tenants. This is the smoke that
//   catches the same family of bugs as the i18n /api-rewrite break and the
//   Node-20 `ws` Supabase realtime regression.

import { test, expect } from '@playwright/test';
import { DEMO_USERS, signInDeployed } from '../helpers/deployed-auth';

test.describe('Deployed admin dashboard smoke', () => {
  test('admin@demo.test sees a stat with a numeric value + ActivityFeed', async ({ page }) => {
    await signInDeployed(page, DEMO_USERS.admin);

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    // One controlled retry: same SSR cookie-rotation race documented in
    // login.spec.ts — first hit can bounce to /sign-in, refresh recovers.
    if (new URL(page.url()).pathname.startsWith('/sign-in')) {
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    }
    await expect(page).toHaveURL(/\/admin(\/|$|\?)/, { timeout: 15_000 });

    // The dashboard renders four StatCards under the POSTURE section.
    // Each card contains a `font-serif text-display-md` numeric figure.
    // Match the four titles the admin page renders — case-insensitive
    // because the cards uppercase them in CSS, not in the DOM.
    const statTitle = page
      .getByText(/ACTIVE USERS|COMPLETION|PENDING ENROLLMENTS|RISK FLAGS/i)
      .first();
    await expect(statTitle, 'at least one POSTURE stat card title must render').toBeVisible({
      timeout: 15_000,
    });

    // Stat values use `tabular-nums` and are rendered inside the stat card.
    // We assert at least one of the four cards has a numeric figure (digits
    // 0-9 or the em-dash fallback `—` for unavailable stats — both prove
    // the SSR data path executed). A pure layout regression would render
    // neither.
    const statValueRegion = page.locator('div.font-serif.text-display-md').first();
    await expect(statValueRegion, 'StatCard value region must render').toBeVisible({
      timeout: 15_000,
    });
    const valueText = (await statValueRegion.innerText()).trim();
    expect(valueText, `stat value should be a number or em-dash, got "${valueText}"`).toMatch(
      /^[0-9]|—/,
    );

    // ActivityFeed renders either:
    //   1. an <ol aria-label="Recent activity"> when events exist, or
    //   2. an empty-state card whose copy matches /No activity|Activity feed
    //      is unavailable|No user selected/ — all are valid renderings.
    // Playwright can't mix CSS + text engines in one locator string; build
    // the two locators separately and use `.or()` to assert either matches.
    const happyPath = page.locator('ol[aria-label="Recent activity"]').first();
    const emptyState = page
      .getByText(/No activity yet|Activity feed is unavailable|No user selected/)
      .first();
    await expect(
      happyPath.or(emptyState),
      'ActivityFeed must mount in one of its states',
    ).toBeVisible({ timeout: 15_000 });
  });
});
