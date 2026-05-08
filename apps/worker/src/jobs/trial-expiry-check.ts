/**
 * trial-expiry-check job handler.
 *
 * Runs once a day. Archives organizations on the TRIAL plan whose trial ended
 * 7+ days ago and that never converted to a paid subscription. The 7-day grace
 * window gives operators time to reach out and recover the account before
 * we hard-stop access via archivedAt.
 *
 * Selection criteria:
 *   - plan = TRIAL
 *   - trialEndsAt <= now() - 7 days  (trial expired more than a week ago)
 *   - archivedAt IS NULL              (not already archived)
 *   - subscriptionStatus IS NULL      (never had a paid subscription)
 *
 * Each archive is paired with an `org.trial_archived` AuditLog row so support
 * has a forensic trail. Errors on a single org are logged and swallowed —
 * one bad row must not abort the whole sweep.
 */

import type { Job } from 'bullmq';
import type { TrialExpiryCheckInput, TrialExpiryCheckOutput } from '@levelup/queue';
import { prisma, Plan, Prisma } from '@levelup/db';
import { logger } from '../logger.js';

/** 7-day grace window after trialEndsAt before auto-archiving. */
const TRIAL_GRACE_DAYS = 7;

export async function handleTrialExpiryCheck(
  job: Job<TrialExpiryCheckInput>,
): Promise<TrialExpiryCheckOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const triggeredAt = job.data.triggeredAt ?? new Date().toISOString();
  log.info('trial-expiry-check: starting', { triggeredAt });

  const start = Date.now();

  const cutoff = new Date(Date.now() - TRIAL_GRACE_DAYS * 24 * 60 * 60 * 1000);

  const orgs = await prisma.organization.findMany({
    where: {
      AND: [
        { plan: Plan.TRIAL },
        { trialEndsAt: { lte: cutoff } },
        { archivedAt: null },
        { subscriptionStatus: null },
      ],
    },
    select: { id: true, name: true, trialEndsAt: true },
  });

  log.info('trial-expiry-check: orgs to archive', { count: orgs.length });

  let archivedCount = 0;
  const now = new Date();

  for (const org of orgs) {
    try {
      await prisma.organization.update({
        where: { id: org.id },
        data: { archivedAt: now },
      });

      // Audit writes never block the sweep — log and continue on failure.
      await prisma.auditLog
        .create({
          data: {
            organizationId: org.id,
            actorId: null,
            action: 'org.trial_archived',
            targetType: 'Organization',
            targetId: org.id,
            metadata: {
              trialEndedAt: org.trialEndsAt?.toISOString() ?? null,
              archivedAt: now.toISOString(),
              reason: 'trial-expiry-grace-elapsed',
            } as Prisma.InputJsonValue,
          },
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          log.error('trial-expiry-check: audit write failed', { orgId: org.id, error: message });
        });

      archivedCount += 1;
      log.info('trial-expiry-check: archived expired trial', {
        orgId: org.id,
        name: org.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('trial-expiry-check: archive failed', { orgId: org.id, error: message });
      // Continue with the next org — a single failure must not abort the run.
    }
  }

  const durationMs = Date.now() - start;
  log.info('trial-expiry-check: completed', {
    scanned: orgs.length,
    archivedCount,
    durationMs,
  });

  // remindedCount + expiredCount are reserved for future expansion (3-day
  // warning email and day-14 soft-lock). The archival sweep is the only
  // currently-implemented stage.
  return {
    remindedCount: 0,
    expiredCount: 0,
    archivedCount,
  };
}
