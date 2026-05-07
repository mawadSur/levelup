/**
 * 02 — Admin People flow
 *
 * Tests:
 *   1. Admin can navigate to /admin/people.
 *   2. Admin can open the "Invite teammate" dialog.
 *   3. Filling email + role + (optional) dept and submitting shows a success
 *      toast and the invitation appears in the Invitations tab.
 *   4. Refreshing the Invitations tab reflects the new invitation.
 *
 * Cleanup: each test revokes the e2e-created invitation in afterEach so the
 * DB stays clean for subsequent runs.
 */

import { test, expect } from '../fixtures/test-fixtures';
import { listInvitations, revokeInvitation } from '../helpers/api';

const E2E_INVITEE = 'e2e-invitee@demo.test';

test.describe('Admin — People page', () => {
  test('admin can navigate to /admin/people and see the People heading', async ({ adminPage }) => {
    await adminPage.goto('/admin/people');
    await expect(adminPage.getByRole('heading', { name: /people/i })).toBeVisible();
  });

  test('admin can send an invitation and see it in the Invitations tab', async ({
    adminPage,
    adminCookie,
  }) => {
    await adminPage.goto('/admin/people');

    // ── note initial pending invitation count ──────────────────────────────
    const invitesBefore = await listInvitations(adminCookie);
    const pendingBefore = invitesBefore.filter((i) => i.status === 'PENDING').length;

    // ── click "Invite teammate" ────────────────────────────────────────────
    await adminPage.getByRole('button', { name: /invite teammate/i }).click();

    // Dialog should open (DialogTitle = "Invite a teammate")
    await expect(adminPage.getByRole('heading', { name: /invite a teammate/i })).toBeVisible();

    // ── fill the form ──────────────────────────────────────────────────────
    await adminPage.getByLabel(/email address/i).fill(E2E_INVITEE);

    // Role selector — default is EMPLOYEE, which is correct for this test.
    // The SelectTrigger has id="invite-role"; we interact via the visible text.
    const roleSelect = adminPage.locator('#invite-role');
    await roleSelect.click();
    await adminPage.getByRole('option', { name: /employee/i }).click();

    // ── submit ─────────────────────────────────────────────────────────────
    await adminPage.getByRole('button', { name: /send invite/i }).click();

    // Expect a success toast: "Invitation sent to e2e-invitee@demo.test"
    await expect(
      adminPage.getByText(new RegExp(`invitation sent to ${E2E_INVITEE}`, 'i')),
    ).toBeVisible({ timeout: 10_000 });

    // ── switch to Invitations tab ─────────────────────────────────────────
    await adminPage.getByRole('tab', { name: /invitations/i }).click();

    // The new invitation row should now appear in the table.
    await expect(adminPage.getByText(E2E_INVITEE)).toBeVisible({ timeout: 10_000 });

    // ── verify via API that count increased ───────────────────────────────
    const invitesAfter = await listInvitations(adminCookie);
    const pendingAfter = invitesAfter.filter((i) => i.status === 'PENDING').length;
    expect(pendingAfter).toBeGreaterThan(pendingBefore);
  });

  // ── afterEach cleanup: revoke any invitation to E2E_INVITEE ──────────────
  test.afterEach(async ({ adminCookie }) => {
    try {
      const invites = await listInvitations(adminCookie);
      const e2eInvites = invites.filter((i) => i.email === E2E_INVITEE);
      for (const inv of e2eInvites) {
        if (inv.status === 'PENDING') {
          await revokeInvitation(inv.id, adminCookie);
        }
      }
    } catch {
      // Cleanup failure should not fail the test — log and move on.
      console.warn('[02-admin-people] afterEach cleanup failed');
    }
  });
});
