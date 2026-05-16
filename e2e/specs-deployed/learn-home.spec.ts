// Why this is a deployed-only spec:
//   /learn is the EMPLOYEE landing route. It fans out 9 parallel API calls
//   (paths, progress, assessments, game state, quests, curriculum, news,
//   nudges, study plan) — every one of those went through the rewritten
//   /api proxy and the SSR auth header. The same i18n config flip that
//   broke /api on Vercel manifested first as /learn being completely
//   empty. This spec smokes the "did /learn even render its hero shell"
//   path against real prod tenants.

import { test, expect } from '@playwright/test';
import { DEMO_USERS, signInDeployed } from '../helpers/deployed-auth';

test.describe('Deployed /learn home smoke', () => {
  test('ed@demo.test (PRACTITIONER) lands on /learn and sees the home shell', async ({ page }) => {
    await signInDeployed(page, DEMO_USERS.employee);

    await page.goto('/learn', { waitUntil: 'domcontentloaded' });
    // Same controlled retry as admin-dashboard.spec.ts for the (learn)
    // layout SSR cookie-rotation race.
    if (new URL(page.url()).pathname.startsWith('/sign-in')) {
      await page.goto('/learn', { waitUntil: 'domcontentloaded' });
    }
    await expect(page).toHaveURL(/\/learn(\/|$|\?)/, { timeout: 15_000 });

    // Hero greeting "Hi, <firstName>." is rendered unconditionally as a
    // styled <h1>. This is the most stable selector on /learn — the path
    // grid that used to sit here was moved to /curriculum (which has the
    // `data-testid="path-card"` ids), so we anchor on the hero.
    const hero = page.getByRole('heading', { level: 1 }).first();
    await expect(hero, '/learn must render the h1 hero greeting').toBeVisible({
      timeout: 15_000,
    });
    await expect(hero).toHaveText(/^Hi,\s+\S+\.?$/i);

    // The LEVEL / XP / STREAK stat chips are also always rendered (they
    // read from game state with `?? 1` / `?? 0` fallbacks, so they exist
    // even for brand-new accounts). These are the only stable
    // data-testid selectors on /learn — see apps/web/src/app/(learn)/learn/page.tsx.
    await expect(
      page.locator('[data-testid="stat-chip-level"]'),
      'LEVEL stat chip must render on /learn',
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('[data-testid="stat-chip-xp"]'),
      'XP stat chip must render on /learn',
    ).toBeVisible({ timeout: 15_000 });

    // "Browse the curriculum" CTA anchors the explore-curriculum
    // NumberedSection — the closest thing /learn has to a "path entry
    // point" and a strong signal the section rendered server-side.
    await expect(
      page.getByRole('link', { name: /Browse the curriculum/i }),
      '"Browse the curriculum" CTA must render',
    ).toBeVisible({ timeout: 15_000 });
  });
});
