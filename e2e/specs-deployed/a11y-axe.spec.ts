// Why this is a deployed-only spec:
//   This is the Wave-3 a11y follow-up to the 2026-05-12 sweep
//   (docs/qa/a11y-report-2026-05-12.md). It re-runs axe-core against the
//   four surfaces that have changed since then: /admin, /learn, /profile,
//   /coach. We deliberately scan against deployed tenants (not a local
//   server) so the audit reflects the real DOM that ships to users —
//   including the Vercel-built CSS, the real fonts, and the real i18n /
//   Supabase session paths that have repeatedly been the source of
//   layout/role drift.
//
// Scope: CRITICAL violations only. Serious / moderate / minor are
//   intentionally left as a follow-up (Wave 4). This spec FAILS the suite
//   only when axe reports an impact of "critical" on any of the four
//   routes.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DEMO_USERS, signInDeployed } from '../helpers/deployed-auth';

interface Route {
  path: string;
  /** Which demo user to sign in as before scanning. */
  signInAs: 'admin' | 'employee';
  /** Optional element to wait for so the page is hydrated before axe runs. */
  readySelector?: string;
}

const ROUTES: Route[] = [
  { path: '/admin', signInAs: 'admin', readySelector: 'h1, main' },
  { path: '/learn', signInAs: 'employee', readySelector: 'h1' },
  { path: '/profile', signInAs: 'admin', readySelector: 'main, h1' },
  { path: '/coach', signInAs: 'employee', readySelector: 'main, h1' },
];

test.describe('Deployed a11y (axe-core, critical-only) — Wave 3', () => {
  for (const route of ROUTES) {
    test(`${route.path} has zero critical axe violations`, async ({ page }) => {
      const email = route.signInAs === 'admin' ? DEMO_USERS.admin : DEMO_USERS.employee;
      await signInDeployed(page, email);

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      if (new URL(page.url()).pathname.startsWith('/sign-in')) {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      }

      if (route.readySelector !== undefined) {
        await page
          .locator(route.readySelector)
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 })
          .catch(() => {
            // Some surfaces render an empty state with no <h1>; don't fail the
            // axe run on the readiness probe — let the scanner inspect what
            // actually mounted.
          });
      }

      // Run axe with the default WCAG 2.0/2.1 A + AA rule set. Filter to
      // critical-only after the run so reporting still surfaces the others
      // without failing the suite on them.
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const critical = results.violations.filter((v) => v.impact === 'critical');

      // Pretty-print critical violations into the failure message so the
      // CI log is actionable without downloading the report.
      const summary = critical
        .map(
          (v) => `- [${v.id}] ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`,
        )
        .join('\n');

      expect(critical, `Critical axe violations on ${route.path}:\n${summary}`).toEqual([]);
    });
  }
});
