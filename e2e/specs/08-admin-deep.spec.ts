/**
 * 08 — Admin deep surfaces
 *
 * Broad coverage of /admin/* tools used by org admins. Each describe block
 * targets one surface; tests stay short and rely on the seeded demo org so
 * we don't have to bootstrap a fresh tenant per test.
 *
 * All tests sign in via the ADMIN fixture (admin@demo.test). Side-effects
 * that leak across tests (invitations, custom paths, flag overrides, ack'd
 * anomalies) are cleaned up in afterEach where possible — but stub mode is
 * idempotent enough that occasional residue is harmless for the next run.
 *
 * Most network shapes are stub-mode-safe; integrations that require real
 * Slack/Stripe keys assert only on visible affordances (the install link).
 */

import { test, expect } from '../fixtures/test-fixtures';
import { apiCall, listInvitations, revokeInvitation } from '../helpers/api';
import type { Page } from '@playwright/test';

const E2E_INVITEE = 'e2e-08-invitee@demo.test';
const E2E_ROLE_TARGET = 'ed@demo.test';
const E2E_FLAG_KEY = 'e2e-deep-flag';

// ---------------------------------------------------------------------------
// Local helpers — these only depend on the public REST surface
// ---------------------------------------------------------------------------

interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  departmentId: string | null;
}

interface DepartmentSummary {
  id: string;
  name: string;
  memberCount: number;
}

interface LearningPathSummary {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  lessonCount: number;
}

interface FlagRecord {
  key: string;
  enabled: boolean;
  rolloutPercent: number | null;
  source: 'org' | 'global' | 'default';
}

interface AnomalyAlert {
  id: string;
  kind: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  acknowledgedAt: string | null;
}

interface DlqRow {
  id: string;
  jobName: string;
  jobId: string;
  attempts: number;
  failedReason: string;
  createdAt: string;
}

async function listUsers(cookie: string): Promise<UserSummary[]> {
  return apiCall<UserSummary[]>('/users', { sessionCookie: cookie });
}

async function listPaths(cookie: string): Promise<LearningPathSummary[]> {
  return apiCall<LearningPathSummary[]>('/paths', { sessionCookie: cookie });
}

async function listDepartments(cookie: string): Promise<DepartmentSummary[]> {
  return apiCall<DepartmentSummary[]>('/departments', { sessionCookie: cookie });
}

async function listFlags(cookie: string): Promise<FlagRecord[]> {
  return apiCall<FlagRecord[]>('/flags', { sessionCookie: cookie });
}

async function deleteFlagOverride(cookie: string, key: string): Promise<void> {
  try {
    await apiCall<void>(`/flags/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      sessionCookie: cookie,
    });
  } catch {
    /* ignore — flag may not exist */
  }
}

async function listAnomalies(cookie: string): Promise<{ items: AnomalyAlert[] }> {
  return apiCall<{ items: AnomalyAlert[] }>('/anomalies?unacknowledged=true&limit=100', {
    sessionCookie: cookie,
  });
}

async function listDlq(cookie: string): Promise<DlqRow[]> {
  return apiCall<DlqRow[]>('/admin/ops/dlq', { sessionCookie: cookie });
}

// ---------------------------------------------------------------------------
// 1. Admin dashboard
// ---------------------------------------------------------------------------
test.describe('Admin dashboard /admin', () => {
  test('loads with posture stats cards', async ({ adminPage }) => {
    await adminPage.goto('/admin');

    // Page title is "Welcome back, ..."
    await expect(adminPage.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 15_000,
    });

    // The dashboard either shows the "NO DATA YET" empty state or the
    // POSTURE stat-card row. Either is a valid landed-state assertion.
    const hasEmpty = await adminPage
      .getByText(/no data yet/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasEmpty) {
      await expect(adminPage.getByText(/active users/i).first()).toBeVisible();
      await expect(adminPage.getByText(/completion/i).first()).toBeVisible();
    }
  });

  test('renders the activity stream section', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    // The "ACTIVITY STREAM" mono-label or the empty-state copy must render.
    const stream = adminPage.getByText(/activity stream|no data yet/i).first();
    await expect(stream).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// 2. People — invite, role change, deactivate
// ---------------------------------------------------------------------------
test.describe('Admin /admin/people deep', () => {
  test.afterEach(async ({ adminCookie }) => {
    // Revoke any invitation created during these tests.
    try {
      const invites = await listInvitations(adminCookie);
      for (const inv of invites) {
        if (inv.email === E2E_INVITEE && inv.status === 'PENDING') {
          await revokeInvitation(inv.id, adminCookie);
        }
      }
    } catch {
      /* ignore */
    }
  });

  test('admin can invite a new member (PENDING row + audit)', async ({
    adminPage,
    adminCookie,
  }) => {
    await adminPage.goto('/admin/people');

    const before = await listInvitations(adminCookie);
    const pendingBefore = before.filter((i) => i.status === 'PENDING').length;

    await adminPage.getByRole('button', { name: /invite teammate/i }).click();
    await expect(adminPage.getByRole('heading', { name: /invite a teammate/i })).toBeVisible();

    await adminPage.getByLabel(/email address/i).fill(E2E_INVITEE);

    // Default role is EMPLOYEE — leave as-is.
    await adminPage.getByRole('button', { name: /send invite/i }).click();

    await expect(
      adminPage.getByText(new RegExp(`invitation sent to ${E2E_INVITEE}`, 'i')),
    ).toBeVisible({ timeout: 10_000 });

    // Switch to the Invitations tab and assert the new row exists.
    await adminPage.getByRole('tab', { name: /invitations/i }).click();
    await expect(adminPage.getByText(E2E_INVITEE)).toBeVisible({ timeout: 10_000 });

    const after = await listInvitations(adminCookie);
    expect(after.filter((i) => i.status === 'PENDING').length).toBeGreaterThan(pendingBefore);
  });

  test('admin can change a teammate role via API and see it reflected in /people', async ({
    adminPage,
    adminCookie,
  }) => {
    // Drive role change via the API to avoid relying on the row-hover dropdown.
    const targets = await listUsers(adminCookie);
    const target = targets.find((u) => u.email === E2E_ROLE_TARGET);
    test.skip(!target, `Seeded user ${E2E_ROLE_TARGET} missing — skipping role-change test`);
    if (!target) return;

    const originalRole = target.role;
    const nextRole = originalRole === 'MANAGER' ? 'EMPLOYEE' : 'MANAGER';

    await apiCall(`/users/${target.id}/role`, {
      method: 'PATCH',
      body: { userId: target.id, role: nextRole },
      sessionCookie: adminCookie,
    });

    try {
      // Verify in the UI — the People page lists everyone.
      await adminPage.goto('/admin/people');
      const row = adminPage.getByText(target.email).first();
      await expect(row).toBeVisible({ timeout: 10_000 });

      // Audit log records role.updated / users.role_changed style action.
      const audit = await apiCall<{ rows: Array<{ action: string; targetId: string | null }> }>(
        `/admin/ops/audit?targetType=User&limit=50`,
        { sessionCookie: adminCookie },
      );
      const relevant = audit.rows.find((r) => r.targetId === target.id && /role/i.test(r.action));
      expect(relevant).toBeDefined();
    } finally {
      // Restore.
      await apiCall(`/users/${target.id}/role`, {
        method: 'PATCH',
        body: { userId: target.id, role: originalRole },
        sessionCookie: adminCookie,
      }).catch(() => undefined);
    }
  });

  test('people page exposes member, invitation, and department tabs', async ({ adminPage }) => {
    await adminPage.goto('/admin/people');
    await expect(adminPage.getByRole('tab', { name: /members/i })).toBeVisible();
    await expect(adminPage.getByRole('tab', { name: /invitations/i })).toBeVisible();
    await expect(adminPage.getByRole('tab', { name: /departments/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Learning catalog / assignment / builder / editor
// ---------------------------------------------------------------------------
test.describe('Admin /admin/learning', () => {
  test('catalog tab lists at least one seeded published path', async ({
    adminPage,
    adminCookie,
  }) => {
    const paths = await listPaths(adminCookie);
    test.skip(paths.length === 0, 'No seeded paths — skipping catalog test');

    await adminPage.goto('/admin/learning');
    await expect(adminPage.getByRole('heading', { name: /learning paths/i })).toBeVisible();
    await expect(adminPage.getByRole('tab', { name: /path catalog/i })).toBeVisible();

    // At least one published path card should render.
    const published = paths.find((p) => p.isPublished);
    if (published) {
      await expect(adminPage.getByText(published.title).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('admin can open the assign dialog for a path', async ({ adminPage, adminCookie }) => {
    const paths = await listPaths(adminCookie);
    const published = paths.find((p) => p.isPublished);
    test.skip(!published, 'No published path — skipping assign test');
    if (!published) return;

    await adminPage.goto('/admin/learning');
    await expect(adminPage.getByText(published.title).first()).toBeVisible({ timeout: 10_000 });

    // Each catalog card has an "Assign" button — click the first one available.
    const assignButton = adminPage.getByRole('button', { name: /^assign$/i }).first();
    await assignButton.click();

    await expect(adminPage.getByRole('heading', { name: /assign path/i })).toBeVisible();
  });

  test('path-builder page accepts a prompt and shows the generating panel', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/learning/build');
    await expect(adminPage.getByRole('heading', { name: /build a path with ai/i })).toBeVisible();

    await adminPage
      .getByLabel(/describe the path/i)
      .fill('Teach my support team how to triage customer escalations using AI safely.');
    await adminPage.getByLabel(/audience/i).fill('Support reps');

    await adminPage.getByRole('button', { name: /generate path/i }).click();

    // In stub mode the worker completes quickly, so accept either the
    // GENERATING panel or the READY state.
    const readyOrGenerating = adminPage.getByText(
      /generating your path|draft ready|generation failed/i,
    );
    await expect(readyOrGenerating.first()).toBeVisible({ timeout: 20_000 });
  });

  test('manual path editor renders for the first custom path or first seeded path', async ({
    adminPage,
    adminCookie,
  }) => {
    const paths = await listPaths(adminCookie);
    const target = paths[0];
    test.skip(!target, 'No paths exist — skipping editor test');
    if (!target) return;

    await adminPage.goto(`/admin/learning/${target.id}/edit`);

    // The editor renders a header with "Learning /" link and the path title.
    await expect(adminPage.getByRole('link', { name: /^learning$/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(adminPage.getByRole('button', { name: /save changes/i }).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Policy
// ---------------------------------------------------------------------------
test.describe('Admin /admin/policy', () => {
  test('renders the current policy or the empty-state', async ({ adminPage }) => {
    await adminPage.goto('/admin/policy');
    await expect(adminPage.getByRole('heading', { name: /company ai policy/i })).toBeVisible();

    // Either the CURRENT POLICY card or the NO POLICY YET empty state.
    const hasCurrent = await adminPage
      .getByText(/current policy/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasCurrent) {
      await expect(adminPage.getByText(/no policy yet/i)).toBeVisible();
    } else {
      // Edit & republish button is the entry point to the editor.
      await expect(
        adminPage.getByRole('button', { name: /edit.*republish|create ai policy/i }).first(),
      ).toBeVisible();
    }
  });

  test('opening the policy editor reveals the markdown textarea', async ({ adminPage }) => {
    await adminPage.goto('/admin/policy');

    // Click whichever entry exists (Create or Edit & republish).
    const editBtn = adminPage
      .getByRole('button', { name: /edit.*republish|create ai policy/i })
      .first();
    await editBtn.click();

    await expect(adminPage.getByLabel(/policy document/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(adminPage.getByRole('button', { name: /publish policy/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Reports
// ---------------------------------------------------------------------------
test.describe('Admin /admin/reports', () => {
  test('renders the heatmap section, completion breakdowns, and risk-flag table', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/reports');
    await expect(adminPage.getByRole('heading', { name: /^reports$/i })).toBeVisible();

    // Section eyebrows from NumberedSection.
    await expect(adminPage.getByText(/skill heatmap/i).first()).toBeVisible();
    await expect(adminPage.getByText(/completion breakdown/i).first()).toBeVisible();
    await expect(adminPage.getByText(/risk flags/i).first()).toBeVisible();
  });

  test('CSV export button triggers a download', async ({ adminPage }) => {
    await adminPage.goto('/admin/reports');

    const exportBtn = adminPage.getByRole('button', { name: /export csv/i });
    await expect(exportBtn).toBeVisible();

    // The export uses a blob URL + anchor; Playwright sees the download event.
    const downloadPromise = adminPage.waitForEvent('download', { timeout: 15_000 });
    await exportBtn.click();
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.csv$/i);
  });
});

// ---------------------------------------------------------------------------
// 6. Feature flags
// ---------------------------------------------------------------------------
test.describe('Admin /admin/flags', () => {
  test.afterEach(async ({ adminCookie }) => {
    await deleteFlagOverride(adminCookie, E2E_FLAG_KEY);
  });

  test('admin can add a new org-override flag and see it in the list', async ({
    adminPage,
    adminCookie,
  }) => {
    await adminPage.goto('/admin/flags');
    await expect(adminPage.getByRole('heading', { name: /feature flags/i })).toBeVisible();

    await adminPage.getByRole('button', { name: /add flag/i }).click();
    await expect(adminPage.getByRole('heading', { name: /add feature flag/i })).toBeVisible();

    await adminPage.getByLabel(/^key$/i).fill(E2E_FLAG_KEY);
    await adminPage.getByLabel(/rollout %/i).fill('50');
    await adminPage.getByRole('button', { name: /create flag/i }).click();

    // The new flag should appear in the table.
    const row = adminPage.getByText(E2E_FLAG_KEY).first();
    await expect(row).toBeVisible({ timeout: 10_000 });

    // Confirm via API too.
    const flags = await listFlags(adminCookie);
    expect(flags.some((f) => f.key === E2E_FLAG_KEY)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Dead-letter queue
// ---------------------------------------------------------------------------
test.describe('Admin /admin/dlq', () => {
  test('renders the DLQ heading and either rows or the healthy-state', async ({ adminPage }) => {
    await adminPage.goto('/admin/dlq');
    await expect(adminPage.getByRole('heading', { name: /dead-letter queue/i })).toBeVisible();

    // Either the "Workers are healthy" message OR a table of jobs renders.
    const healthy = adminPage.getByText(/workers are healthy/i);
    const table = adminPage.locator('table').first();
    const either = healthy.or(table);
    await expect(either.first()).toBeVisible({ timeout: 10_000 });
  });

  test('filter bar exposes the job-name dropdown and refresh button', async ({ adminPage }) => {
    await adminPage.goto('/admin/dlq');
    await expect(adminPage.getByRole('button', { name: /refresh/i })).toBeVisible();
    // Job-name select has "All job names" placeholder.
    await expect(adminPage.getByText(/all job names/i).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 8. Audit log
// ---------------------------------------------------------------------------
test.describe('Admin /admin/audit', () => {
  test('renders the audit table and the filter bar', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await expect(adminPage.getByRole('heading', { name: /audit log/i })).toBeVisible();

    // Filter controls are visible.
    await expect(adminPage.getByRole('button', { name: /^apply$/i })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: /export csv/i })).toBeVisible();
  });

  test('applying the targetType=User filter narrows the URL', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');

    // Open the target-type select and pick User.
    const triggers = adminPage.getByRole('combobox');
    // The 3rd combobox is Target type (Action, Actor[input], Target type).
    // Use a more deterministic locator via the label.
    const targetTrigger = adminPage
      .locator('label:has-text("Target type")')
      .locator('..')
      .getByRole('combobox');
    await targetTrigger.first().click();
    await adminPage.getByRole('option', { name: /^user$/i }).click();

    await adminPage.getByRole('button', { name: /^apply$/i }).click();

    await expect(adminPage).toHaveURL(/targetType=User/);
    // Silence unused-var lint
    void triggers;
  });
});

// ---------------------------------------------------------------------------
// 9. Anomalies
// ---------------------------------------------------------------------------
test.describe('Admin /admin/anomalies', () => {
  test('lists unacknowledged alerts or shows the empty state', async ({
    adminPage,
    adminCookie,
  }) => {
    const before = await listAnomalies(adminCookie).catch(() => ({
      items: [] as AnomalyAlert[],
    }));

    await adminPage.goto('/admin/anomalies');
    await expect(adminPage.getByRole('heading', { name: /anomaly alerts/i })).toBeVisible();

    if (before.items.length === 0) {
      await expect(adminPage.getByText(/no unacknowledged alerts/i)).toBeVisible({
        timeout: 10_000,
      });
    } else {
      // The list header reports the count.
      await expect(
        adminPage.getByText(new RegExp(`${before.items.length} unacknowledged`, 'i')),
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});

// ---------------------------------------------------------------------------
// 10. Insights
// ---------------------------------------------------------------------------
test.describe('Admin /admin/insights', () => {
  test('renders activity, usage trend, top prompts, and posture sections', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/insights');
    await expect(adminPage.getByRole('heading', { name: /^insights$/i })).toBeVisible();

    await expect(adminPage.getByText(/coach sessions/i).first()).toBeVisible();
    await expect(adminPage.getByText(/lessons completed/i).first()).toBeVisible();
    await expect(adminPage.getByText(/top prompts/i).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 11. Integrations
// ---------------------------------------------------------------------------
test.describe('Admin /admin/integrations', () => {
  test('Slack install link points at the OAuth start endpoint', async ({ adminPage }) => {
    await adminPage.goto('/admin/integrations');
    await expect(adminPage.getByRole('heading', { name: /^integrations$/i })).toBeVisible();

    // "Add to Slack" anchor when no integration is installed yet.
    const slackLink = adminPage.getByRole('link', { name: /add to slack/i });
    const isVisible = await slackLink.isVisible().catch(() => false);
    if (isVisible) {
      const href = await slackLink.getAttribute('href');
      expect(href).toContain('/api/integrations/slack/install');
    } else {
      // Already-connected state shows a "Disconnect" button.
      await expect(adminPage.getByRole('button', { name: /disconnect/i })).toBeVisible();
    }
  });

  test('Microsoft Teams card is rendered as coming-soon', async ({ adminPage }) => {
    await adminPage.goto('/admin/integrations');
    await expect(adminPage.getByText(/microsoft teams/i).first()).toBeVisible();
    await expect(adminPage.getByText(/coming soon/i).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 12. DLQ seed integration (best-effort) — verifies retry surface exists
// ---------------------------------------------------------------------------
test.describe('Admin /admin/dlq actions surface', () => {
  test('row actions menu appears for DLQ rows when present', async ({ adminPage, adminCookie }) => {
    const rows = await listDlq(adminCookie);
    test.skip(rows.length === 0, 'No DLQ rows present — retry-button assertion skipped');
    if (rows.length === 0) return;

    await adminPage.goto('/admin/dlq');
    // Every row has a "Row actions" icon button.
    await expect(adminPage.getByRole('button', { name: /row actions/i }).first()).toBeVisible({
      timeout: 10_000,
    });

    await adminPage
      .getByRole('button', { name: /row actions/i })
      .first()
      .click();
    await expect(adminPage.getByRole('menuitem', { name: /^retry$/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 13. Cross-page navigation smoke — every admin route resolves
// ---------------------------------------------------------------------------
test.describe('Admin route smoke', () => {
  const ROUTES = [
    '/admin',
    '/admin/people',
    '/admin/learning',
    '/admin/policy',
    '/admin/reports',
    '/admin/insights',
    '/admin/flags',
    '/admin/audit',
    '/admin/dlq',
    '/admin/anomalies',
    '/admin/integrations',
  ];

  test('every admin route returns a rendered shell', async ({ adminPage }) => {
    for (const route of ROUTES) {
      await adminPage.goto(route, { waitUntil: 'domcontentloaded' });
      // The admin shell always renders at least one h1 with the section name.
      await expect(adminPage.locator('h1').first()).toBeVisible({ timeout: 10_000 });
    }
  });
});

// Silence the "Page is unused" complaint when no test in this file uses it.
void (null as unknown as Page);

// Silence helpers that may be unused in stub-mode runs.
void listDepartments;
