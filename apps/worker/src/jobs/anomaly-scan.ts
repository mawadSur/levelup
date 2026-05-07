/**
 * anomaly-scan job handler — CR.40 proactive risk surface.
 *
 * Runs hourly. For each active org (cap 1000 per run) it executes five
 * detectors that each return 0-N AnomalyAlert candidates. All candidates
 * are written with a soft-uniqueness guard: we skip the insert if an alert
 * with the same (organizationId, kind, userId) already exists within the
 * past 24 hours to prevent duplicate noise from back-to-back runs.
 *
 * Detectors:
 *   1. COACH_USAGE_SPIKE   — today >= 5× 14-day daily avg (priorAvg >= 1)
 *   2. SENSITIVE_DATA_BURST — >= 5 sensitive events in 24h
 *   3. STREAK_BROKEN_AT_RISK — streak >= 7, no freeze, lastActive <= 22h ago
 *   4. PATH_BUILDER_ABUSE  — org >= 8 PathGenerationRequests in 24h
 *   5. PROMPT_CLONING_ABUSE — user > 30 PROMPT_CLONED XpEvents in 24h
 */

import type { Job } from 'bullmq';
import type { AnomalyScanInput, AnomalyScanOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import type { AnomalyKind, AnomalySeverity, Prisma } from '@levelup/db';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum orgs to scan per run — prevents runaway memory on large deployments. */
const MAX_ORGS_PER_RUN = 1000;

/** 24-hour dedup window — don't re-emit the same (org, kind, user) within 24h. */
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Coach usage spike threshold multipliers. */
const SPIKE_MEDIUM_RATIO = 5;
const SPIKE_HIGH_RATIO = 10;

/** Minimum prior average to avoid false-positives for brand-new users. */
const MIN_PRIOR_AVG = 1;

/** Sensitive data burst threshold — HIGH if >= this many in 24h. */
const SENSITIVE_BURST_THRESHOLD = 5;

/** Streak-at-risk window — flag if lastActiveDate is >= this many hours old. */
const STREAK_AT_RISK_HOURS = 22;

/** Minimum streak length before the STREAK_BROKEN_AT_RISK alert fires. */
const MIN_STREAK_FOR_ALERT = 7;

/** PATH_BUILDER_ABUSE early-warning threshold (actual cap is 10/day). */
const PATH_BUILDER_WARN_THRESHOLD = 8;

/** PROMPT_CLONING_ABUSE threshold — HIGH if > this many in 24h. */
const PROMPT_CLONING_THRESHOLD = 30;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertCandidate {
  organizationId: string;
  userId: string | null;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  signal: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function anomalyScanHandler(job: Job<AnomalyScanInput>): Promise<AnomalyScanOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const triggeredAt = job.data.triggeredAt ?? new Date().toISOString();
  log.info('anomaly-scan: starting', { triggeredAt });

  const start = Date.now();

  // 1. Load all active orgs (cap to MAX_ORGS_PER_RUN)
  const orgs = await prisma.organization.findMany({
    select: { id: true },
    take: MAX_ORGS_PER_RUN,
    orderBy: { createdAt: 'asc' },
  });

  log.info('anomaly-scan: orgs loaded', { count: orgs.length });

  const now = new Date();
  const h24Ago = new Date(now.getTime() - DEDUP_WINDOW_MS);

  // Pre-load existing recent alerts for dedup (one query, all orgs)
  const recentAlerts = await prisma.anomalyAlert.findMany({
    where: {
      organizationId: { in: orgs.map((o) => o.id) },
      createdAt: { gte: h24Ago },
    },
    select: { organizationId: true, kind: true, userId: true },
  });

  // Build a dedup Set: key = `${organizationId}::${kind}::${userId ?? ''}`
  const dedupSet = new Set<string>(
    recentAlerts.map((a) => `${a.organizationId}::${a.kind}::${a.userId ?? ''}`),
  );

  let alertsCreated = 0;
  const allCandidates: AlertCandidate[] = [];

  // 2. Run detectors per org
  for (const org of orgs) {
    try {
      const candidates = await runDetectorsForOrg(org.id, now, h24Ago);
      allCandidates.push(...candidates);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('anomaly-scan: detector error', { orgId: org.id, error: message });
      // Continue with other orgs — one bad org must not abort the whole scan.
    }
  }

  // 3. Filter duplicates and batch-insert
  const newAlerts = allCandidates.filter((c) => {
    const key = `${c.organizationId}::${c.kind}::${c.userId ?? ''}`;
    return !dedupSet.has(key);
  });

  if (newAlerts.length > 0) {
    const created = await prisma.anomalyAlert.createMany({
      data: newAlerts.map((c) => ({
        organizationId: c.organizationId,
        userId: c.userId,
        kind: c.kind,
        severity: c.severity,
        signal: c.signal as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
    alertsCreated = created.count;
  }

  const durationMs = Date.now() - start;
  log.info('anomaly-scan: completed', {
    orgsScanned: orgs.length,
    alertsCreated,
    durationMs,
  });

  return { orgsScanned: orgs.length, alertsCreated };
}

// ---------------------------------------------------------------------------
// Per-org detector orchestrator
// ---------------------------------------------------------------------------

async function runDetectorsForOrg(
  organizationId: string,
  now: Date,
  h24Ago: Date,
): Promise<AlertCandidate[]> {
  const [coachSpike, sensitiveBurst, streakAtRisk, pathBuilderAbuse, promptCloning] =
    await Promise.all([
      detectCoachUsageSpike(organizationId, now, h24Ago),
      detectSensitiveDataBurst(organizationId, h24Ago),
      detectStreakAtRisk(organizationId, now),
      detectPathBuilderAbuse(organizationId, h24Ago),
      detectPromptCloningAbuse(organizationId, h24Ago),
    ]);

  return [...coachSpike, ...sensitiveBurst, ...streakAtRisk, ...pathBuilderAbuse, ...promptCloning];
}

// ---------------------------------------------------------------------------
// Detector 1: COACH_USAGE_SPIKE
// ---------------------------------------------------------------------------

async function detectCoachUsageSpike(
  organizationId: string,
  now: Date,
  h24Ago: Date,
): Promise<AlertCandidate[]> {
  const priorWindowStart = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 14 days + 1

  // Count today's sessions per user
  const todayCounts = await prisma.aiCoachSession.groupBy({
    by: ['userId'],
    where: { organizationId, createdAt: { gte: h24Ago } },
    _count: { id: true },
  });

  if (todayCounts.length === 0) return [];

  const userIds = todayCounts.map((r) => r.userId);

  // Count prior-14-day sessions per user
  const priorCounts = await prisma.aiCoachSession.groupBy({
    by: ['userId'],
    where: {
      organizationId,
      userId: { in: userIds },
      createdAt: { gte: priorWindowStart, lt: h24Ago },
    },
    _count: { id: true },
  });

  const priorByUser = new Map<string, number>(priorCounts.map((r) => [r.userId, r._count.id]));

  const candidates: AlertCandidate[] = [];

  for (const row of todayCounts) {
    const today = row._count.id;
    const priorTotal = priorByUser.get(row.userId) ?? 0;
    const priorAvg = priorTotal / 14;

    if (priorAvg < MIN_PRIOR_AVG) continue; // new/inactive user

    const ratio = today / priorAvg;

    if (ratio >= SPIKE_HIGH_RATIO) {
      candidates.push({
        organizationId,
        userId: row.userId,
        kind: 'COACH_USAGE_SPIKE',
        severity: 'HIGH',
        signal: { kind: 'COACH_USAGE_SPIKE', today, priorAvg, ratio },
      });
    } else if (ratio >= SPIKE_MEDIUM_RATIO) {
      candidates.push({
        organizationId,
        userId: row.userId,
        kind: 'COACH_USAGE_SPIKE',
        severity: 'MEDIUM',
        signal: { kind: 'COACH_USAGE_SPIKE', today, priorAvg, ratio },
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Detector 2: SENSITIVE_DATA_BURST
// ---------------------------------------------------------------------------

async function detectSensitiveDataBurst(
  organizationId: string,
  h24Ago: Date,
): Promise<AlertCandidate[]> {
  const rows = await prisma.auditLog.groupBy({
    by: ['actorId'],
    where: {
      organizationId,
      action: 'coach.sensitive_data_detected',
      createdAt: { gte: h24Ago },
    },
    _count: { id: true },
    having: { id: { _count: { gte: SENSITIVE_BURST_THRESHOLD } } },
  });

  return rows.map((row) => ({
    organizationId,
    userId: row.actorId,
    kind: 'SENSITIVE_DATA_BURST' as AnomalyKind,
    severity: 'HIGH' as AnomalySeverity,
    signal: {
      kind: 'SENSITIVE_DATA_BURST',
      count24h: row._count.id,
      categories: [] as string[],
    },
  }));
}

// ---------------------------------------------------------------------------
// Detector 3: STREAK_BROKEN_AT_RISK
// ---------------------------------------------------------------------------

async function detectStreakAtRisk(organizationId: string, now: Date): Promise<AlertCandidate[]> {
  const cutoff = new Date(now.getTime() - STREAK_AT_RISK_HOURS * 60 * 60 * 1000);

  const rows = await prisma.userGameState.findMany({
    where: {
      currentStreak: { gte: MIN_STREAK_FOR_ALERT },
      streakFreezes: 0,
      lastActiveDate: { lte: cutoff },
      user: { organizationId, deactivatedAt: null },
    },
    select: {
      userId: true,
      currentStreak: true,
      lastActiveDate: true,
    },
  });

  const candidates: AlertCandidate[] = [];

  for (const row of rows) {
    const hoursUntilBreak = row.lastActiveDate
      ? Math.max(
          0,
          (row.lastActiveDate.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / (60 * 60 * 1000),
        )
      : 0;

    // Only alert if break is imminent (within 2h) but not already broken
    const willBreakSoon = hoursUntilBreak <= 2 && hoursUntilBreak > 0;
    if (!willBreakSoon) continue;

    candidates.push({
      organizationId,
      userId: row.userId,
      kind: 'STREAK_BROKEN_AT_RISK' as AnomalyKind,
      severity: 'LOW' as AnomalySeverity,
      signal: {
        kind: 'STREAK_BROKEN_AT_RISK',
        currentStreak: row.currentStreak,
        hoursUntilBreak,
      },
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Detector 4: PATH_BUILDER_ABUSE
// ---------------------------------------------------------------------------

async function detectPathBuilderAbuse(
  organizationId: string,
  h24Ago: Date,
): Promise<AlertCandidate[]> {
  const count = await prisma.pathGenerationRequest.count({
    where: { organizationId, createdAt: { gte: h24Ago } },
  });

  if (count < PATH_BUILDER_WARN_THRESHOLD) return [];

  return [
    {
      organizationId,
      userId: null,
      kind: 'PATH_BUILDER_ABUSE',
      severity: 'HIGH',
      signal: { kind: 'PATH_BUILDER_ABUSE', count24h: count },
    },
  ];
}

// ---------------------------------------------------------------------------
// Detector 5: PROMPT_CLONING_ABUSE
// ---------------------------------------------------------------------------

async function detectPromptCloningAbuse(
  organizationId: string,
  h24Ago: Date,
): Promise<AlertCandidate[]> {
  const rows = await prisma.xpEvent.groupBy({
    by: ['userId'],
    where: {
      organizationId,
      kind: 'PROMPT_CLONED',
      createdAt: { gte: h24Ago },
    },
    _count: { id: true },
    having: { id: { _count: { gt: PROMPT_CLONING_THRESHOLD } } },
  });

  return rows.map((row) => ({
    organizationId,
    userId: row.userId,
    kind: 'PROMPT_CLONING_ABUSE' as AnomalyKind,
    severity: 'MEDIUM' as AnomalySeverity,
    signal: {
      kind: 'PROMPT_CLONING_ABUSE',
      count24h: row._count.id,
    },
  }));
}
