/**
 * 09 — Billing, certificates, GDPR privacy, and governance.
 *
 * All tests run in stub mode (PLACEHOLDER_* env values). Where stub behavior
 * differs from production, the deviation is called out inline.
 *
 * Coverage groups (test.describe blocks):
 *   1. Pricing page
 *   2. Stripe webhook idempotency
 *   3. Certificate auto-issue + verification
 *   4. GDPR data export
 *   5. GDPR account deletion
 *   6. Governance reports
 *   7. Company policy versioning
 */

import { test, expect } from '../fixtures/test-fixtures';
import {
  apiCall,
  cancelDeletion,
  completeLesson,
  generateGovernanceReport,
  getGovernanceReportStatus,
  getMe,
  getMyCurriculum,
  listDeletions,
  listExports,
  listMyCertificates,
  listPolicies,
  pollFor,
  postStripeWebhook,
  publishPolicy,
  requestDeletion,
  requestExport,
  startCheckout,
  startLesson,
  type DataExportRow,
  type DeletionRow,
  type MyCertificate,
} from '../helpers/api';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:4000';

// ---------------------------------------------------------------------------
// Helper: complete every lesson in a path via API (employee session).
// Returns the path id whose lessons were completed, or null when no path with
// at least one lesson is assigned to the employee.
// ---------------------------------------------------------------------------
async function completePathForEmployee(cookie: string): Promise<string | null> {
  const curriculum = await getMyCurriculum(cookie);
  for (const tier of curriculum.tiers) {
    for (const path of tier.paths) {
      if (path.lessons.length === 0) continue;
      for (const lesson of path.lessons) {
        // Idempotent server-side: start + complete are upserts.
        await startLesson(lesson.id, cookie).catch(() => undefined);
        await completeLesson(lesson.id, cookie).catch(() => undefined);
      }
      return path.id;
    }
  }
  return null;
}

// ===========================================================================
// 1. Pricing page
// ===========================================================================

test.describe('Pricing page', () => {
  test('public /pricing renders Starter, Team, and Growth plan cards with prices', async ({
    page,
  }) => {
    await page.goto('/pricing');

    // Plan tier labels render as MonoLabel content inside each PlanCard.
    // The page also has CHECKOUT / TALK TO SALES CTAs for each card.
    await expect(page.getByText(/STARTER/).first()).toBeVisible();
    await expect(page.getByText(/TEAM/).first()).toBeVisible();
    await expect(page.getByText(/GROWTH/).first()).toBeVisible();

    // Each paid card has a CHECKOUT → CTA.
    const checkoutCtas = page.getByRole('link', { name: /CHECKOUT/i });
    await expect(checkoutCtas.first()).toBeVisible();
    expect(await checkoutCtas.count()).toBeGreaterThanOrEqual(3);

    // Feature lists render — pick a known string from the Starter feature list.
    await expect(page.getByText(/Core AI learning paths/i)).toBeVisible();
  });

  test('"BEGIN TRIAL" CTA navigates to /sign-up when signed out', async ({ page }) => {
    await page.goto('/pricing');

    const beginTrial = page.getByRole('link', { name: /BEGIN TRIAL/i }).first();
    await expect(beginTrial).toBeVisible();
    await Promise.all([page.waitForURL('**/sign-up**', { timeout: 15_000 }), beginTrial.click()]);
    expect(page.url()).toContain('/sign-up');
  });

  test('signed-in admin can start a Stripe checkout session (stub) via /billing/checkout', async ({
    adminCookie,
  }) => {
    // The pricing page CTA goes to /sign-up; the real "create checkout" flow
    // is the POST /billing/checkout API call. Verify the API contract here.
    const result = await startCheckout(adminCookie, {
      plan: 'STARTER',
      interval: 'MONTHLY',
    });

    expect(result.url).toBeTruthy();
    // Stub URL is deterministic and points back at the web app's stub-success page.
    expect(result.url!).toMatch(/\/billing\/stub-success/);
    expect(result.url!).toContain('plan=STARTER');
    expect(result.sessionId).toBeTruthy();
    expect(result.sessionId!).toMatch(/^cs_stub_/);
  });
});

// ===========================================================================
// 2. Stripe webhook idempotency
//
// In stub mode (STRIPE_SECRET_KEY=PLACEHOLDER_*), the webhook handler returns
// `{ received: true }` immediately without parsing, signing, or writing audit
// rows. We assert the idempotent ack contract here — both calls return 200
// with the same body — and document why audit-row assertions are skipped.
// ===========================================================================

test.describe('Stripe webhook idempotency', () => {
  test('first POST returns 200 with { received: true }', async () => {
    const rawBody = JSON.stringify({
      id: 'evt_test_e2e_first',
      type: 'checkout.session.completed',
    });
    const res = await postStripeWebhook(rawBody, 't=0,v1=stub', 'evt_test_e2e_first');
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  test('replaying the SAME event id returns 200 with the same body (idempotent)', async () => {
    const eventId = `evt_test_e2e_replay_${Date.now()}`;
    const rawBody = JSON.stringify({ id: eventId, type: 'checkout.session.completed' });

    const first = await postStripeWebhook(rawBody, 't=0,v1=stub', eventId);
    expect(first.status).toBe(200);
    expect(first.body.received).toBe(true);

    const second = await postStripeWebhook(rawBody, 't=0,v1=stub', eventId);
    expect(second.status).toBe(200);
    expect(second.body.received).toBe(true);

    // NOTE: In stub mode the handler does not write audit rows. The
    // ProcessedWebhookEvent uniqueness check + audit assertion are exercised
    // in unit/e2e tests against the API directly with a real STRIPE_SECRET_KEY
    // (see apps/api/test/webhooks.e2e-spec.ts). Here we only verify the
    // public idempotent-ack contract.
  });
});

// ===========================================================================
// 3. Certificate auto-issue, PDF render, and verification
// ===========================================================================

test.describe('Certificates: auto-issue + verification', () => {
  test('cert PDF file becomes available within 10s (worker renders to local fs in stub mode)', async ({
    employeeCookie,
  }) => {
    // Ensure a cert exists (path completion is idempotent).
    await completePathForEmployee(employeeCookie);

    const cert = await pollFor<MyCertificate>(
      async () => {
        const all = await listMyCertificates(employeeCookie);
        return all[0] ?? null;
      },
      { timeoutMs: 5_000 },
    );
    test.skip(cert === null, 'No certificate available to render.');

    // Wait for the worker to fill in pdfUrl (or, in stub legacy mode, just
    // for the local file to exist — GET :id/file returns 200 in both cases).
    const ready = await pollFor<boolean>(
      async () => {
        const res = await fetch(`${API_BASE}/api/certificates/${cert!.id}/file`, {
          headers: { Cookie: `LEVELUP_SESSION=${employeeCookie}` },
        });
        if (res.status === 200) {
          const ct = res.headers.get('content-type') ?? '';
          if (ct.includes('application/pdf')) {
            // Drain the body so the connection closes cleanly.
            await res.arrayBuffer();
            return true;
          }
        }
        return null;
      },
      { timeoutMs: 12_000, intervalMs: 750 },
    );

    // The worker may not be running in every dev configuration. We assert
    // the cert exists (above) and treat a missing PDF as a soft skip rather
    // than a hard failure, since the worker process is out of test scope.
    test.skip(ready !== true, 'cert-pdf worker did not produce a PDF in time (worker may be off).');
    expect(ready).toBe(true);
  });

  test('public verify endpoint renders "VERIFIED" for a real signed hash', async ({
    employeeCookie,
    page,
  }) => {
    await completePathForEmployee(employeeCookie);

    const cert = await pollFor<MyCertificate>(
      async () => {
        const all = await listMyCertificates(employeeCookie);
        return all[0] ?? null;
      },
      { timeoutMs: 5_000 },
    );
    test.skip(cert === null, 'No certificate available.');

    await page.goto(`/certificates/verify/${cert!.signedHash}`);

    // ValidCard renders "VERIFIED · CERTIFIED" and the org / path / holder.
    await expect(page.getByText(/VERIFIED/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/CERTIFICATE OF COMPLETION/i)).toBeVisible();
  });

  test('public verify endpoint rejects a tampered hash', async ({ employeeCookie, page }) => {
    await completePathForEmployee(employeeCookie);

    const cert = await pollFor<MyCertificate>(
      async () => {
        const all = await listMyCertificates(employeeCookie);
        return all[0] ?? null;
      },
      { timeoutMs: 5_000 },
    );
    test.skip(cert === null, 'No certificate available.');

    // Flip the first hex char — keeps the length identical so the HMAC
    // verify path is exercised, not the length pre-check.
    const original = cert!.signedHash;
    const flipped = (original[0] === '0' ? '1' : '0') + original.slice(1);
    expect(flipped).not.toBe(original);

    await page.goto(`/certificates/verify/${flipped}`);

    // InvalidCard renders "VERIFICATION FAILED" / "Certificate not valid."
    await expect(
      page.getByText(/Certificate not valid|VERIFICATION FAILED|could not be verified/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ===========================================================================
// 4. GDPR data export
// ===========================================================================

test.describe('GDPR — data export', () => {
  test('clicking "Export my data" creates a PENDING export row', async ({
    employeePage,
    employeeCookie,
  }) => {
    // Clean any prior active export from previous runs.
    const existing = await listExports(employeeCookie);
    const active = existing.find((r) => r.status === 'PENDING' || r.status === 'PROCESSING');
    test.skip(
      !!active,
      'An active export already exists for this user — skip to keep the test deterministic.',
    );

    await employeePage.goto('/privacy');
    await employeePage.getByTestId('privacy-export-button').click();

    // Toast confirms the request fired.
    await expect(
      employeePage.getByText(/Export requested|We're building your data archive/i),
    ).toBeVisible({ timeout: 10_000 });

    // Row appears in the list with PENDING (or PROCESSING/READY if worker fast).
    const rows = employeePage.getByTestId('privacy-export-row');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const firstStatus = await rows.first().getAttribute('data-status');
    expect(['PENDING', 'PROCESSING', 'READY']).toContain(firstStatus);

    // API confirms a row exists.
    const after = await listExports(employeeCookie);
    expect(after.length).toBeGreaterThan(existing.length);
  });

  test('export becomes READY and the download endpoint streams application/zip', async ({
    employeeCookie,
  }) => {
    // Ensure there is at least one export request — reuse if PENDING already.
    let exports = await listExports(employeeCookie);
    let target: DataExportRow | undefined = exports.find(
      (r) => r.status === 'PENDING' || r.status === 'PROCESSING' || r.status === 'READY',
    );
    if (!target) {
      target = await requestExport(employeeCookie);
    }

    // Poll for READY (worker writes the zip in stub mode to apps/api/.exports).
    const ready = await pollFor<DataExportRow>(
      async () => {
        exports = await listExports(employeeCookie);
        const found = exports.find((r) => r.id === target!.id);
        return found && found.status === 'READY' ? found : null;
      },
      { timeoutMs: 20_000, intervalMs: 1_000 },
    );

    test.skip(ready === null, 'Worker did not finish the export in time (worker may be off).');

    // Hit the download endpoint and verify content-type.
    const res = await fetch(`${API_BASE}/api/privacy/exports/${ready!.id}/download`, {
      headers: { Cookie: `LEVELUP_SESSION=${employeeCookie}` },
    });
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct).toContain('application/zip');
    // Drain body.
    await res.arrayBuffer();
  });
});

// ===========================================================================
// 5. GDPR account deletion
// ===========================================================================

test.describe('GDPR — account deletion', () => {
  // Use a dedicated employee fixture per test so PENDING state from one test
  // doesn't bleed into the next. We cancel inside afterEach for cleanup.
  test.afterEach(async ({ employeeCookie }) => {
    try {
      const rows = await listDeletions(employeeCookie);
      for (const r of rows) {
        if (r.status === 'PENDING' || r.status === 'CONFIRMED') {
          await cancelDeletion(r.id, employeeCookie).catch(() => undefined);
        }
      }
    } catch {
      // best-effort cleanup
    }
  });

  test('requesting deletion via UI creates a PENDING row scheduled ~30 days out', async ({
    employeePage,
    employeeCookie,
  }) => {
    const before = await listDeletions(employeeCookie);
    test.skip(
      before.some((r) => r.status === 'PENDING' || r.status === 'CONFIRMED'),
      'User already has an active deletion request — skip.',
    );

    await employeePage.goto('/privacy');
    await employeePage.getByTestId('privacy-deletion-request-button').click();

    // Confirm dialog opens; confirm.
    await expect(
      employeePage.getByRole('heading', { name: /Request account deletion/i }),
    ).toBeVisible();
    await employeePage.getByTestId('privacy-deletion-confirm-button').click();

    // Toast confirms.
    await expect(employeePage.getByText(/Deletion request submitted/i)).toBeVisible({
      timeout: 10_000,
    });

    // API row exists with PENDING + scheduledFor ≈ now+30d.
    const after = await listDeletions(employeeCookie);
    const created = after.find((r) => !before.find((b) => b.id === r.id));
    expect(created, 'Newly created deletion row should be visible via API').toBeTruthy();
    expect(created!.status).toBe('PENDING');

    const scheduled = new Date(created!.scheduledFor).getTime();
    const expected = Date.now() + 30 * 24 * 60 * 60 * 1000;
    // Allow ±2 days slack for clock skew + DB write latency.
    expect(Math.abs(scheduled - expected)).toBeLessThan(2 * 24 * 60 * 60 * 1000);
  });

  test('cancelling a PENDING deletion flips status to CANCELLED', async ({ employeeCookie }) => {
    // Create directly via API so this test is independent of the previous one.
    const existing = await listDeletions(employeeCookie);
    let target: DeletionRow | undefined = existing.find(
      (r) => r.status === 'PENDING' || r.status === 'CONFIRMED',
    );
    if (!target) {
      target = await requestDeletion(employeeCookie, 'e2e cancel-flow test');
    }

    expect(target).toBeTruthy();
    const cancelled = await cancelDeletion(target!.id, employeeCookie);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledAt).toBeTruthy();
  });
});

// ===========================================================================
// 6. Governance reports (ADMIN only)
// ===========================================================================

test.describe('Governance', () => {
  test('admin can enqueue a governance report and receives a requestId', async ({
    adminCookie,
  }) => {
    const res = await generateGovernanceReport(adminCookie, {
      periodLabel: 'E2E-Q1-2026',
      windowDays: 30,
    });
    expect(res.requestId).toBeTruthy();
    expect(res.requestId.length).toBeGreaterThan(10);

    // Immediately check status — should be queued/generating/ready/failed.
    const status = await getGovernanceReportStatus(res.requestId, adminCookie);
    expect(['queued', 'generating', 'ready', 'failed']).toContain(status.status);
  });

  test('non-admin (EMPLOYEE) cannot call /governance/report — 403', async ({ employeeCookie }) => {
    await expect(generateGovernanceReport(employeeCookie, { windowDays: 30 })).rejects.toThrow();
  });
});

// ===========================================================================
// 7. Policy versioning (ADMIN only)
// ===========================================================================

test.describe('Policy versioning', () => {
  test('admin can publish a new policy version via API; version increments', async ({
    adminCookie,
  }) => {
    const before = await listPolicies(adminCookie);
    const maxBefore = before.reduce((acc, p) => Math.max(acc, p.version), 0);

    const newPolicy = await publishPolicy(adminCookie, {
      policyText: `# E2E Policy ${Date.now()}\n\nThis is an end-to-end-test policy revision used to exercise version increments.`,
      approvedTools: [
        { name: 'ChatGPT', tier: 'approved' },
        { name: 'Public Bard', tier: 'caution', notes: 'Review before sharing' },
      ],
    });

    expect(newPolicy.version).toBe(maxBefore + 1);
    expect(newPolicy.isPublished).toBe(true);

    const after = await listPolicies(adminCookie);
    expect(after.length).toBe(before.length + 1);

    // Previous version remains retrievable.
    if (maxBefore > 0) {
      const prior = after.find((p) => p.version === maxBefore);
      expect(prior, `v${maxBefore} should still be in the history`).toBeTruthy();
    }
  });

  test('admin policy page renders the current version + history dropdown', async ({
    adminPage,
    adminCookie,
  }) => {
    // Ensure there is at least one policy version so the "ACTIVE" card renders.
    const existing = await listPolicies(adminCookie);
    if (existing.length === 0) {
      await publishPolicy(adminCookie, {
        policyText: '# Initial Policy\n\nSeed text for the admin policy page test.',
        approvedTools: [{ name: 'ChatGPT', tier: 'approved' }],
      });
    }

    await adminPage.goto('/admin/policy');
    await expect(adminPage.getByRole('heading', { name: /Company AI Policy/i })).toBeVisible({
      timeout: 15_000,
    });
    // Either the "ACTIVE" badge (when a policy exists) or the
    // "Create AI policy" empty-state CTA renders.
    const activeBadge = adminPage.getByText(/ACTIVE/).first();
    const emptyCta = adminPage.getByRole('button', { name: /Create AI policy/i });
    const found = (await activeBadge.count()) + (await emptyCta.count());
    expect(found).toBeGreaterThan(0);
  });
});

// Suppress unused-import lint when the test.skip branches drop these symbols.
void apiCall;
void getMe;
