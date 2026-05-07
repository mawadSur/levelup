/**
 * manager-digest-cron job handler.
 *
 * Runs every Monday at 8am UTC (scheduled via BullMQ repeat pattern in main.ts).
 *
 * For every active MANAGER and ADMIN in the system:
 *   1. Computes team completion metrics for the past 7 days.
 *   2. Derives top-3 risk flags using inline heuristics.
 *   3. Finds top-3 XP movers in the last 7 days.
 *   4. Enqueues a `send-email` job with templateKey 'manager-digest'.
 *   5. Writes a single `digest.scheduled` audit log entry per manager (not per
 *      recipient — that would be too noisy).
 *
 * Any per-manager error is caught, logged, and skipped so one bad manager
 * never blocks the rest.
 */

import type { Job } from 'bullmq';
import type { ManagerDigestCronInput, ManagerDigestCronOutput } from '@levelup/queue';
import { enqueueEmail } from '@levelup/queue';
import { prisma, IntegrationProvider, IntegrationStatus } from '@levelup/db';
import {
  buildDigestBlocks,
  createSlackClient,
  decrypt,
  type ManagerDigestPayload,
} from '@levelup/integrations-slack';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  departmentId: string | null;
  organization: { name: string };
}

interface RiskSummary {
  label: string;
  count: number;
}

interface MoverSummary {
  name: string;
  xp: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodBounds(now: Date): { periodStart: Date; periodEnd: Date } {
  const periodEnd = new Date(now);
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { periodStart, periodEnd };
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Compute inline risk flags — mirrors the heuristics in reporting.service.ts
 * but scoped to the manager's team.
 */
async function computeRiskFlags(
  organizationId: string,
  teamUserIds: string[],
): Promise<RiskSummary[]> {
  if (teamUserIds.length === 0) return [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [sensitiveDataRows, staleAssignmentRows, usersWithBaselineSet] = await Promise.all([
    // HIGH: 3+ sensitive_data_detected events in last 30 days
    prisma.auditLog.groupBy({
      by: ['actorId'],
      where: {
        organizationId,
        actorId: { in: teamUserIds },
        action: 'coach.sensitive_data_detected',
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { _all: true },
    }),

    // MED: assigned 30+ days ago with 0 lessons completed
    prisma.learningPathAssignment.findMany({
      where: {
        userId: { in: teamUserIds },
        assignedAt: { lte: thirtyDaysAgo },
      },
      select: {
        userId: true,
        learningPath: { select: { lessons: { select: { id: true } } } },
      },
    }),

    // LOW: no baseline assessment
    prisma.assessment.findMany({
      where: { userId: { in: teamUserIds }, type: 'BASELINE' },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  const highCount = sensitiveDataRows.filter((r) => r._count._all >= 3).length;

  // Resolve stale-assignment users
  const staleUserIds = [...new Set(staleAssignmentRows.map((a) => a.userId))];
  let medCount = 0;
  if (staleUserIds.length > 0) {
    const completedCounts = await prisma.userProgress.groupBy({
      by: ['userId'],
      where: { userId: { in: staleUserIds }, status: 'COMPLETED' },
      _count: { _all: true },
    });
    const completedSet = new Set(completedCounts.map((r) => r.userId));
    medCount = staleUserIds.filter((uid) => !completedSet.has(uid)).length;
  }

  const baselineSet = new Set(usersWithBaselineSet.map((a) => a.userId));
  const lowCount = teamUserIds.filter((uid) => !baselineSet.has(uid)).length;

  const flags: RiskSummary[] = [];
  if (highCount > 0) flags.push({ label: 'Sensitive data events (30d)', count: highCount });
  if (medCount > 0) flags.push({ label: 'Stale assignments (0 progress)', count: medCount });
  if (lowCount > 0) flags.push({ label: 'No baseline assessment', count: lowCount });

  return flags.slice(0, 3);
}

/**
 * Get top-3 XP earners in the last 7 days within the team.
 */
async function computeTopMovers(teamUserIds: string[], periodStart: Date): Promise<MoverSummary[]> {
  if (teamUserIds.length === 0) return [];

  const xpRows = await prisma.xpEvent.groupBy({
    by: ['userId'],
    where: {
      userId: { in: teamUserIds },
      createdAt: { gte: periodStart },
    },
    _sum: { xp: true },
    orderBy: { _sum: { xp: 'desc' } },
    take: 3,
  });

  const topUserIds = xpRows.map((r) => r.userId);
  if (topUserIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: topUserIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(users.map((u) => [u.id, u.name]));

  return xpRows.map((r) => ({
    name: nameMap.get(r.userId) ?? r.userId,
    xp: r._sum.xp ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function managerDigestHandler(
  job: Job<ManagerDigestCronInput>,
): Promise<ManagerDigestCronOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const triggeredAt = job.data.triggeredAt ?? new Date().toISOString();

  log.info('manager-digest-cron: starting', { triggeredAt });
  const startMs = Date.now();

  const now = new Date();
  const { periodStart, periodEnd } = periodBounds(now);
  const periodLabel = `${formatDateLabel(periodStart)} – ${formatDateLabel(periodEnd)}`;

  // -------------------------------------------------------------------------
  // Stream all active MANAGER / ADMIN users in batches of 200
  // -------------------------------------------------------------------------
  let managersNotified = 0;
  let cursor: string | undefined;
  const BATCH = 200;

  while (true) {
    const batch: UserRow[] = (await prisma.user.findMany({
      where: {
        role: { in: ['MANAGER', 'ADMIN'] },
        deactivatedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        departmentId: true,
        organization: { select: { name: true } },
      },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })) as UserRow[];

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1]!.id;

    for (const manager of batch) {
      try {
        // -------------------------------------------------------------------
        // Resolve the team scope
        // -------------------------------------------------------------------
        const teamQuery =
          manager.role === 'ADMIN'
            ? // ADMIN: all users in org
              prisma.user.findMany({
                where: {
                  organizationId: manager.organizationId,
                  deactivatedAt: null,
                  id: { not: manager.id },
                },
                select: { id: true },
              })
            : // MANAGER: department scope (falls back to org if no departmentId)
              manager.departmentId
              ? prisma.user.findMany({
                  where: {
                    organizationId: manager.organizationId,
                    departmentId: manager.departmentId,
                    deactivatedAt: null,
                    id: { not: manager.id },
                  },
                  select: { id: true },
                })
              : prisma.user.findMany({
                  where: {
                    organizationId: manager.organizationId,
                    deactivatedAt: null,
                    id: { not: manager.id },
                  },
                  select: { id: true },
                });

        const teamUsers = await teamQuery;
        const teamUserIds = teamUsers.map((u) => u.id);
        const totalLearners = teamUserIds.length;

        // -------------------------------------------------------------------
        // Completion stats for the period
        // -------------------------------------------------------------------
        let completedLearners = 0;
        let completionPct = 0;

        if (totalLearners > 0) {
          const completedUserIds = await prisma.userProgress.findMany({
            where: {
              userId: { in: teamUserIds },
              status: 'COMPLETED',
              completedAt: { gte: periodStart, lte: periodEnd },
            },
            select: { userId: true },
            distinct: ['userId'],
          });
          completedLearners = completedUserIds.length;
          completionPct = Math.round((completedLearners / totalLearners) * 100);
        }

        // -------------------------------------------------------------------
        // Risk flags + movers (run in parallel)
        // -------------------------------------------------------------------
        const [riskFlags, _topMovers] = await Promise.all([
          computeRiskFlags(manager.organizationId, teamUserIds),
          computeTopMovers(teamUserIds, periodStart),
        ]);

        // -------------------------------------------------------------------
        // Enqueue send-email
        // -------------------------------------------------------------------
        await enqueueEmail({
          to: manager.email,
          templateKey: 'manager-digest',
          data: {
            managerName: manager.name,
            orgName: manager.organization.name,
            completionPct,
            totalLearners,
            completedLearners,
            riskFlags,
            periodLabel,
            organizationId: manager.organizationId,
          },
        });

        // -------------------------------------------------------------------
        // Slack DM delivery (if integration is active for this org)
        // Wrapped in try/catch so Slack errors never block email delivery.
        // -------------------------------------------------------------------
        try {
          const slackIntegration = await prisma.organizationIntegration.findUnique({
            where: {
              organizationId_provider: {
                organizationId: manager.organizationId,
                provider: IntegrationProvider.SLACK,
              },
            },
          });

          if (
            slackIntegration &&
            slackIntegration.status === IntegrationStatus.ACTIVE &&
            slackIntegration.botToken
          ) {
            const botToken = decrypt(slackIntegration.botToken);
            const client = createSlackClient(botToken);

            // Look up the manager's Slack user id by their LevelUp email
            const lookupResp = await client.users.lookupByEmail({
              email: manager.email,
            });

            if (lookupResp.ok && lookupResp.user?.id) {
              const slackUserId = lookupResp.user.id;

              // Open DM channel
              const openResp = await client.conversations.open({
                users: slackUserId,
              });

              if (openResp.ok && openResp.channel?.id) {
                const digestPayload: ManagerDigestPayload = {
                  managerName: manager.name,
                  orgName: manager.organization.name,
                  periodLabel,
                  completionPct,
                  totalLearners,
                  completedLearners,
                  riskFlags,
                };
                const blocks = buildDigestBlocks(digestPayload);

                await client.chat.postMessage({
                  channel: openResp.channel.id,
                  blocks,
                  text: `Weekly LevelUp digest for ${manager.organization.name} — ${periodLabel}`,
                });

                await prisma.auditLog.create({
                  data: {
                    organizationId: manager.organizationId,
                    actorId: null,
                    action: 'digest.slack_sent',
                    targetType: 'User',
                    targetId: manager.id,
                    metadata: {
                      managerId: manager.id,
                      slackUserId,
                      periodLabel,
                    },
                  },
                });
              }
            }
          }
        } catch (slackErr) {
          const slackMsg = slackErr instanceof Error ? slackErr.message : String(slackErr);
          log.error('manager-digest-cron: Slack DM delivery failed (non-fatal)', {
            managerId: manager.id,
            error: slackMsg,
          });
        }

        // -------------------------------------------------------------------
        // Audit log — one entry per manager (not per recipient)
        // -------------------------------------------------------------------
        await prisma.auditLog.create({
          data: {
            organizationId: manager.organizationId,
            actorId: null,
            action: 'digest.scheduled',
            targetType: 'User',
            targetId: manager.id,
            metadata: {
              managerId: manager.id,
              periodLabel,
              teamSize: totalLearners,
              completionPct,
            },
          },
        });

        managersNotified++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error('manager-digest-cron: skipping manager due to error', {
          managerId: manager.id,
          error: message,
        });
      }
    }

    // Stop if we got fewer results than the batch size
    if (batch.length < BATCH) break;
  }

  const durationMs = Date.now() - startMs;
  log.info('manager-digest-cron: completed', { managersNotified, durationMs });

  return { managersNotified };
}
