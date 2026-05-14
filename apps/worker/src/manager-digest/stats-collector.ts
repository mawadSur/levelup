/**
 * Stats collector for the Weekly Narrative Manager Digest.
 *
 * Gathers all the inputs that the narrative composer consumes:
 *   - team aggregates this-week vs last-week
 *   - per-direct-report rolling deltas
 *   - top wins / concerns
 *   - optional surfaces (incidents, skill-graph movers) — left empty when the
 *     underlying data isn't available so the composer can degrade gracefully.
 *
 * The collector is org-scoped (single tenant per call). It NEVER sends raw
 * PII downstream — only aggregated counts and learner display names.
 */

import { prisma } from '@levelup/db';
import type {
  ConcernSummary,
  DirectReportRolling,
  IncidentSummary,
  ManagerDigestStats,
  PeriodDelta,
  SkillGraphMover,
  WinSummary,
} from './narrative-composer.js';

interface CollectInput {
  organizationId: string;
  managerName: string;
  managerId: string;
  orgName: string;
  periodLabel: string;
  /** ISO date string for the start of the current period (used as cache key). */
  weekOf: string;
  /** Inclusive [periodStart, periodEnd] window for "this week". */
  periodStart: Date;
  periodEnd: Date;
  /** [prevPeriodStart, prevPeriodEnd] window for "last week" — same duration. */
  prevPeriodStart: Date;
  prevPeriodEnd: Date;
  teamUserIds: string[];
}

function makeDelta(current: number, previous: number): PeriodDelta {
  return { current, previous, delta: current - previous };
}

async function countLessons(userIds: string[], from: Date, to: Date): Promise<number> {
  if (userIds.length === 0) return 0;
  const rows = await prisma.userProgress.findMany({
    where: {
      userId: { in: userIds },
      status: 'COMPLETED',
      completedAt: { gte: from, lte: to },
    },
    select: { id: true },
  });
  return rows.length;
}

async function countLabsPassed(userIds: string[], from: Date, to: Date): Promise<number> {
  if (userIds.length === 0) return 0;
  const rows = await prisma.labAttempt.findMany({
    where: {
      userId: { in: userIds },
      passed: true,
      createdAt: { gte: from, lte: to },
    },
    select: { id: true },
  });
  return rows.length;
}

async function countLabAttempts(userIds: string[], from: Date, to: Date): Promise<number> {
  if (userIds.length === 0) return 0;
  const rows = await prisma.labAttempt.findMany({
    where: {
      userId: { in: userIds },
      createdAt: { gte: from, lte: to },
    },
    select: { id: true },
  });
  return rows.length;
}

async function countCoachSessions(userIds: string[], from: Date, to: Date): Promise<number> {
  if (userIds.length === 0) return 0;
  const rows = await prisma.aiCoachSession.findMany({
    where: {
      userId: { in: userIds },
      createdAt: { gte: from, lte: to },
    },
    select: { id: true },
  });
  return rows.length;
}

async function countSensitiveTriggers(
  organizationId: string,
  userIds: string[],
  from: Date,
  to: Date,
): Promise<number> {
  if (userIds.length === 0) return 0;
  const rows = await prisma.auditLog.findMany({
    where: {
      organizationId,
      actorId: { in: userIds },
      action: 'coach.sensitive_data_detected',
      createdAt: { gte: from, lte: to },
    },
    select: { id: true },
  });
  return rows.length;
}

async function perUserLessons(
  userIds: string[],
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;
  const rows = await prisma.userProgress.groupBy({
    by: ['userId'],
    where: {
      userId: { in: userIds },
      status: 'COMPLETED',
      completedAt: { gte: from, lte: to },
    },
    _count: { _all: true },
  });
  for (const r of rows) map.set(r.userId, r._count._all);
  return map;
}

async function perUserLabRates(
  userIds: string[],
  from: Date,
  to: Date,
): Promise<Map<string, { passed: number; total: number }>> {
  const map = new Map<string, { passed: number; total: number }>();
  if (userIds.length === 0) return map;

  const [passedRows, totalRows] = await Promise.all([
    prisma.labAttempt.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, passed: true, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.labAttempt.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
  ]);

  for (const r of totalRows) {
    map.set(r.userId, { passed: 0, total: r._count._all });
  }
  for (const r of passedRows) {
    const existing = map.get(r.userId) ?? { passed: 0, total: 0 };
    existing.passed = r._count._all;
    map.set(r.userId, existing);
  }
  return map;
}

function safeRate(passed: number, total: number): number {
  if (total === 0) return 0;
  return passed / total;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export async function collectStats(input: CollectInput): Promise<ManagerDigestStats> {
  const { organizationId, teamUserIds, periodStart, periodEnd, prevPeriodStart, prevPeriodEnd } =
    input;

  // -------------------------------------------------------------------------
  // Team aggregates (both windows in parallel)
  // -------------------------------------------------------------------------
  const [lessonsCur, lessonsPrev, labsCur, labsPrev, coachCur, coachPrev, sensCur, sensPrev] =
    await Promise.all([
      countLessons(teamUserIds, periodStart, periodEnd),
      countLessons(teamUserIds, prevPeriodStart, prevPeriodEnd),
      countLabsPassed(teamUserIds, periodStart, periodEnd),
      countLabsPassed(teamUserIds, prevPeriodStart, prevPeriodEnd),
      countCoachSessions(teamUserIds, periodStart, periodEnd),
      countCoachSessions(teamUserIds, prevPeriodStart, prevPeriodEnd),
      countSensitiveTriggers(organizationId, teamUserIds, periodStart, periodEnd),
      countSensitiveTriggers(organizationId, teamUserIds, prevPeriodStart, prevPeriodEnd),
    ]);

  // -------------------------------------------------------------------------
  // Per-direct-report rolling stats
  // -------------------------------------------------------------------------
  const [usersInfo, lessonsCurMap, lessonsPrevMap, labRatesCur, labRatesPrev] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: teamUserIds } },
      select: { id: true, name: true },
    }),
    perUserLessons(teamUserIds, periodStart, periodEnd),
    perUserLessons(teamUserIds, prevPeriodStart, prevPeriodEnd),
    perUserLabRates(teamUserIds, periodStart, periodEnd),
    perUserLabRates(teamUserIds, prevPeriodStart, prevPeriodEnd),
  ]);

  const directReports: DirectReportRolling[] = usersInfo.map((u) => {
    const lcCur = lessonsCurMap.get(u.id) ?? 0;
    const lcPrev = lessonsPrevMap.get(u.id) ?? 0;
    const lrCur = labRatesCur.get(u.id) ?? { passed: 0, total: 0 };
    const lrPrev = labRatesPrev.get(u.id) ?? { passed: 0, total: 0 };
    return {
      userId: u.id,
      name: u.name,
      lessonsCompleted: makeDelta(lcCur, lcPrev),
      labPassRate: makeDelta(
        safeRate(lrCur.passed, lrCur.total),
        safeRate(lrPrev.passed, lrPrev.total),
      ),
    };
  });

  // -------------------------------------------------------------------------
  // Top wins / concerns derived from rolling stats
  // -------------------------------------------------------------------------
  const wins: WinSummary[] = directReports
    .filter((r) => r.labPassRate.delta > 0.1 || r.lessonsCompleted.delta > 1)
    .sort(
      (a, b) =>
        b.labPassRate.delta +
        b.lessonsCompleted.delta -
        (a.labPassRate.delta + a.lessonsCompleted.delta),
    )
    .slice(0, 3)
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      headline:
        r.labPassRate.delta > 0.1
          ? `lab pass rate moved from ${Math.round(r.labPassRate.previous * 100)}% to ${Math.round(r.labPassRate.current * 100)}%`
          : `completed ${r.lessonsCompleted.current} lessons (${r.lessonsCompleted.delta > 0 ? '+' : ''}${r.lessonsCompleted.delta} vs last week)`,
    }));

  const concerns: ConcernSummary[] = directReports
    .filter((r) => r.lessonsCompleted.current === 0 && r.lessonsCompleted.previous === 0)
    .slice(0, 3)
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      headline: `no lessons completed in the past two weeks — assignment may be stale`,
    }));

  // -------------------------------------------------------------------------
  // Optional surfaces (degrade gracefully)
  // -------------------------------------------------------------------------
  const incidents: IncidentSummary[] = [];
  if (sensCur > 0) incidents.push({ label: 'Coach PII flag', count: sensCur });

  // Skill-graph movers — not yet wired to a dedicated table; leave empty so the
  // composer renders without it.
  const skillGraphMovers: SkillGraphMover[] = [];

  return {
    organizationId,
    weekOf: input.weekOf,
    managerName: input.managerName,
    orgName: input.orgName,
    periodLabel: input.periodLabel,
    teamSize: teamUserIds.length,
    lessonsCompleted: makeDelta(lessonsCur, lessonsPrev),
    labsPassed: makeDelta(labsCur, labsPrev),
    coachSessions: makeDelta(coachCur, coachPrev),
    sensitiveTriggers: makeDelta(sensCur, sensPrev),
    directReports,
    topWins: wins,
    topConcerns: concerns,
    incidents,
    skillGraphMovers,
  };
}

/**
 * Read the per-org digest preference: enabled + cadence.
 * Stored on the FeatureFlag table (no schema change required):
 *   - key="manager_digest:enabled"  → enabled / disabled
 *   - key="manager_digest:cadence"  → metadata.cadence in { "weekly", "biweekly" }
 *
 * Defaults: enabled = true, cadence = "weekly".
 */
export interface DigestPreference {
  enabled: boolean;
  cadence: 'weekly' | 'biweekly';
}

export async function readDigestPreference(organizationId: string): Promise<DigestPreference> {
  const [enabledFlag, cadenceFlag] = await Promise.all([
    prisma.featureFlag.findUnique({
      where: { organizationId_key: { organizationId, key: 'manager_digest:enabled' } },
    }),
    prisma.featureFlag.findUnique({
      where: { organizationId_key: { organizationId, key: 'manager_digest:cadence' } },
    }),
  ]);

  // Default: enabled. The flag, if present, drives the override.
  const enabled = enabledFlag === null ? true : enabledFlag.enabled;

  // Cadence stored in metadata.cadence; fall back to 'weekly'.
  let cadence: 'weekly' | 'biweekly' = 'weekly';
  if (cadenceFlag?.metadata && typeof cadenceFlag.metadata === 'object') {
    const m = cadenceFlag.metadata as Record<string, unknown>;
    if (m['cadence'] === 'biweekly') cadence = 'biweekly';
  }

  return { enabled, cadence };
}

/**
 * Should we run the digest for this org this week?
 *
 * - weekly  → always yes (when enabled).
 * - biweekly → yes when ISO week number is even.
 *
 * Week number is computed cheaply from the periodStart so we don't import a
 * date library.
 */
export function shouldRunThisWeek(pref: DigestPreference, periodStart: Date): boolean {
  if (!pref.enabled) return false;
  if (pref.cadence === 'weekly') return true;
  // Biweekly: simple parity check on ISO week.
  const isoWeek = getIsoWeek(periodStart);
  return isoWeek % 2 === 0;
}

function getIsoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week determines the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
