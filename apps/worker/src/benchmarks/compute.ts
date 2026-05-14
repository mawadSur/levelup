/**
 * compute-industry-benchmarks job handler.
 *
 * Weekly cross-tenant aggregation. Honours the cross-tenant privacy contract:
 *
 *   1. Only orgs with `benchmarkOptOut = false` AND `archivedAt = null` count.
 *   2. Hard floor per industry: at least MIN_ORGS_PER_INDUSTRY orgs AND
 *      MIN_USERS_PER_INDUSTRY active users. Industries below the floor are
 *      skipped entirely — no snapshot row is written, no value is exposed.
 *   3. Per-org-first aggregation: every metric collapses individual-user
 *      activity to a single value per org, then quantiles are computed across
 *      orgs. A single hyper-active org cannot dominate the bucket.
 *
 * Metrics published in v1:
 *   - `lesson_completion_rate` — % of assigned lessons each org's users have
 *     completed within the last 30 days.
 *   - `lab_pass_rate` — % of LabAttempt rows that passed on first attempt in
 *     the last 30 days (per-org rate, then quantile across orgs).
 *   - `daily_active_rate` — % of org's users with any UserProgress activity
 *     yesterday (per-org rate, then quantile across orgs).
 *
 * Deferred: `incident_rate` — requires a differential-privacy review before
 * release. Per-incident counts can be small enough (or zero in many orgs) that
 * naive quantiles could leak the presence of any incident from a single org.
 * Add only after DP-noise review.
 *
 * Run cadence: weekly Mondays 02:00 UTC. The period stamp on each snapshot is
 * the most recent ISO-week Monday at 00:00 UTC so repeated runs within the
 * same week upsert the same row instead of growing the table.
 */

import type { Job } from 'bullmq';
import type {
  ComputeIndustryBenchmarksInput,
  ComputeIndustryBenchmarksOutput,
} from '@levelup/queue';
import { prisma } from '@levelup/db';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Privacy floor
// ---------------------------------------------------------------------------

/** Minimum participating orgs per industry slice before exposing a quantile. */
const MIN_ORGS_PER_INDUSTRY = 10;

/** Minimum active users (any UserProgress activity in last 30d) per industry. */
const MIN_USERS_PER_INDUSTRY = 100;

/** Rolling window for the input metrics (lesson completion, lab pass, etc.). */
const METRIC_WINDOW_DAYS = 30;

/** Day window used to determine "active user" for the floor calculation. */
const ACTIVE_USER_WINDOW_DAYS = 30;

/** v1 metric set — must stay in sync with the read endpoint validator. */
const METRICS = ['lesson_completion_rate', 'lab_pass_rate', 'daily_active_rate'] as const;
type Metric = (typeof METRICS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the most recent Monday 00:00 UTC for the given timestamp. */
function isoWeekStart(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Linear-interpolation quantile across a sorted ascending sample. */
function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0]!;
  const idx = (sortedAsc.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo]!;
  const frac = idx - lo;
  return sortedAsc[lo]! * (1 - frac) + sortedAsc[hi]! * frac;
}

interface OrgRow {
  id: string;
  industry: string;
}

interface ComputedMetric {
  /** One value per participating org. Unsorted on input; sorted before quantile. */
  perOrgValues: number[];
  /** Total contributing users across all orgs (for `userSample`). */
  userContributors: number;
}

// ---------------------------------------------------------------------------
// Per-metric, per-industry computations
// ---------------------------------------------------------------------------

interface MetricCountRow {
  orgId: string;
  numerator: bigint;
  denominator: bigint;
  userCount: bigint;
}

async function lessonCompletionRate(orgIds: string[], windowStart: Date): Promise<ComputedMetric> {
  if (orgIds.length === 0) return { perOrgValues: [], userContributors: 0 };
  // Per-org: (# COMPLETED UserProgress rows in window) / (# UserProgress rows in window).
  // We join through the lesson + path to recover the owning org. Paths with
  // organizationId = NULL (global content) attribute to the user's org.
  const rows = await prisma.$queryRaw<MetricCountRow[]>`
    WITH eligible AS (
      SELECT
        u."organizationId" AS "orgId",
        up.status,
        up."userId",
        up."completedAt"
      FROM user_progress up
      JOIN users u ON u.id = up."userId"
      WHERE u."organizationId" = ANY(${orgIds}::text[])
        AND (up."completedAt" >= ${windowStart} OR up.status <> 'COMPLETED')
    )
    SELECT
      "orgId"                                              AS "orgId",
      COUNT(*) FILTER (WHERE status = 'COMPLETED')::bigint AS numerator,
      COUNT(*)::bigint                                     AS denominator,
      COUNT(DISTINCT "userId")::bigint                     AS "userCount"
    FROM eligible
    GROUP BY "orgId"
    HAVING COUNT(*) > 0
  `;

  const perOrgValues: number[] = [];
  let userContributors = 0;
  for (const r of rows) {
    const denom = Number(r.denominator);
    if (denom === 0) continue;
    perOrgValues.push(Number(r.numerator) / denom);
    userContributors += Number(r.userCount);
  }
  return { perOrgValues, userContributors };
}

async function labPassRate(orgIds: string[], windowStart: Date): Promise<ComputedMetric> {
  if (orgIds.length === 0) return { perOrgValues: [], userContributors: 0 };
  // Per-org: (# passed first attempts) / (# distinct (user, lab) pairs in window).
  // "First attempt" = the chronologically earliest LabAttempt per (user, lab).
  const rows = await prisma.$queryRaw<MetricCountRow[]>`
    WITH first_attempts AS (
      SELECT DISTINCT ON ("userId", "labId")
        "organizationId" AS "orgId",
        "userId",
        "labId",
        passed,
        "createdAt"
      FROM lab_attempts
      WHERE "organizationId" = ANY(${orgIds}::text[])
        AND "createdAt" >= ${windowStart}
      ORDER BY "userId", "labId", "createdAt" ASC
    )
    SELECT
      "orgId"                                AS "orgId",
      COUNT(*) FILTER (WHERE passed)::bigint AS numerator,
      COUNT(*)::bigint                       AS denominator,
      COUNT(DISTINCT "userId")::bigint       AS "userCount"
    FROM first_attempts
    GROUP BY "orgId"
    HAVING COUNT(*) > 0
  `;

  const perOrgValues: number[] = [];
  let userContributors = 0;
  for (const r of rows) {
    const denom = Number(r.denominator);
    if (denom === 0) continue;
    perOrgValues.push(Number(r.numerator) / denom);
    userContributors += Number(r.userCount);
  }
  return { perOrgValues, userContributors };
}

async function dailyActiveRate(orgIds: string[]): Promise<ComputedMetric> {
  if (orgIds.length === 0) return { perOrgValues: [], userContributors: 0 };
  // Per-org: (# users with any UserProgress completedAt yesterday) / (total users in org).
  // "Yesterday" = the 24h UTC day immediately preceding now.
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<MetricCountRow[]>`
    WITH org_totals AS (
      SELECT "organizationId" AS "orgId", COUNT(*)::bigint AS total_users
      FROM users
      WHERE "organizationId" = ANY(${orgIds}::text[])
      GROUP BY "organizationId"
    ),
    active_users AS (
      SELECT u."organizationId" AS "orgId", COUNT(DISTINCT u.id)::bigint AS active
      FROM users u
      JOIN user_progress up ON up."userId" = u.id
      WHERE u."organizationId" = ANY(${orgIds}::text[])
        AND up."completedAt" >= ${yesterdayStart}
        AND up."completedAt" < ${todayStart}
      GROUP BY u."organizationId"
    )
    SELECT
      ot."orgId"                            AS "orgId",
      COALESCE(au.active, 0)                AS numerator,
      ot.total_users                        AS denominator,
      COALESCE(au.active, 0)::bigint        AS "userCount"
    FROM org_totals ot
    LEFT JOIN active_users au ON au."orgId" = ot."orgId"
  `;

  const perOrgValues: number[] = [];
  let userContributors = 0;
  for (const r of rows) {
    const denom = Number(r.denominator);
    if (denom === 0) continue;
    perOrgValues.push(Number(r.numerator) / denom);
    userContributors += Number(r.userCount);
  }
  return { perOrgValues, userContributors };
}

// ---------------------------------------------------------------------------
// Active-user floor — how many distinct users in an industry had any
// UserProgress activity in the last ACTIVE_USER_WINDOW_DAYS days.
// ---------------------------------------------------------------------------

interface IndustryActiveUsersRow {
  industry: string;
  active_users: bigint;
}

async function activeUsersByIndustry(
  orgRows: OrgRow[],
  windowStart: Date,
): Promise<Map<string, number>> {
  const orgIds = orgRows.map((r) => r.id);
  if (orgIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<IndustryActiveUsersRow[]>`
    SELECT
      o.industry                          AS industry,
      COUNT(DISTINCT up."userId")::bigint AS active_users
    FROM organizations o
    JOIN users u ON u."organizationId" = o.id
    JOIN user_progress up ON up."userId" = u.id
    WHERE o.id = ANY(${orgIds}::text[])
      AND up."completedAt" >= ${windowStart}
      AND o.industry IS NOT NULL
    GROUP BY o.industry
  `;

  return new Map(rows.map((r) => [r.industry, Number(r.active_users)]));
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function computeIndustryBenchmarksHandler(
  job: Job<ComputeIndustryBenchmarksInput>,
): Promise<ComputeIndustryBenchmarksOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const triggeredAt = job.data.triggeredAt ?? new Date().toISOString();
  const period = isoWeekStart(new Date(triggeredAt));
  const windowStart = new Date(Date.now() - METRIC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const activeWindowStart = new Date(Date.now() - ACTIVE_USER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  log.info('compute-industry-benchmarks: starting', {
    triggeredAt,
    period: period.toISOString(),
  });

  // 1. Eligible orgs: opted-in + not archived + has an industry set.
  const orgRows = (await prisma.organization.findMany({
    where: {
      benchmarkOptOut: false,
      archivedAt: null,
      industry: { not: null },
    },
    select: { id: true, industry: true },
  })) as OrgRow[];

  // 2. Bucket by industry.
  const byIndustry = new Map<string, OrgRow[]>();
  for (const o of orgRows) {
    const arr = byIndustry.get(o.industry) ?? [];
    arr.push(o);
    byIndustry.set(o.industry, arr);
  }

  const industriesInspected = byIndustry.size;

  // 3. Active-user floor per industry (one query for all orgs).
  const activeByIndustry = await activeUsersByIndustry(orgRows, activeWindowStart);

  let industriesPublished = 0;
  let industriesSuppressed = 0;
  let snapshotsWritten = 0;

  for (const [industry, orgs] of byIndustry.entries()) {
    const activeUsers = activeByIndustry.get(industry) ?? 0;
    if (orgs.length < MIN_ORGS_PER_INDUSTRY || activeUsers < MIN_USERS_PER_INDUSTRY) {
      industriesSuppressed += 1;
      log.info('compute-industry-benchmarks: industry suppressed (below floor)', {
        industry,
        orgs: orgs.length,
        activeUsers,
        minOrgs: MIN_ORGS_PER_INDUSTRY,
        minUsers: MIN_USERS_PER_INDUSTRY,
      });
      continue;
    }

    const orgIds = orgs.map((o) => o.id);

    // Compute every v1 metric. NOTE: `incident_rate` is intentionally deferred
    // until differential-privacy review — see file header.
    const [completion, labs, dau] = await Promise.all([
      lessonCompletionRate(orgIds, windowStart),
      labPassRate(orgIds, windowStart),
      dailyActiveRate(orgIds),
    ]);

    const computed: Record<Metric, ComputedMetric> = {
      lesson_completion_rate: completion,
      lab_pass_rate: labs,
      daily_active_rate: dau,
    };

    let publishedAnyMetric = false;
    for (const metric of METRICS) {
      const m = computed[metric];
      // Even after the industry floor, an individual metric might have too few
      // contributing orgs (e.g. only 3 orgs have any LabAttempt rows). The
      // privacy floor on org count applies per-metric too — we never publish a
      // quantile derived from fewer than MIN_ORGS_PER_INDUSTRY orgs.
      if (m.perOrgValues.length < MIN_ORGS_PER_INDUSTRY) {
        log.info('compute-industry-benchmarks: metric suppressed (per-metric floor)', {
          industry,
          metric,
          contributingOrgs: m.perOrgValues.length,
        });
        continue;
      }

      const sorted = [...m.perOrgValues].sort((a, b) => a - b);
      const p25 = quantile(sorted, 0.25);
      const p50 = quantile(sorted, 0.5);
      const p75 = quantile(sorted, 0.75);
      const p90 = quantile(sorted, 0.9);

      await prisma.industryBenchmarkSnapshot.upsert({
        where: { industry_period_metric: { industry, period, metric } },
        create: {
          industry,
          period,
          metric,
          sampleSize: m.perOrgValues.length,
          userSample: m.userContributors,
          p25,
          p50,
          p75,
          p90,
        },
        update: {
          sampleSize: m.perOrgValues.length,
          userSample: m.userContributors,
          p25,
          p50,
          p75,
          p90,
        },
      });

      snapshotsWritten += 1;
      publishedAnyMetric = true;
    }

    if (publishedAnyMetric) {
      industriesPublished += 1;

      // Audit at the industry level — never per-org, never with raw counts.
      // Snapshots themselves are the audit trail for the published values.
      try {
        await prisma.auditLog.create({
          data: {
            organizationId: orgs[0]!.id, // attach to one participating org for indexability
            actorId: null,
            action: 'benchmark.computed',
            targetType: 'IndustryBenchmarkSnapshot',
            targetId: null,
            metadata: {
              industry,
              period: period.toISOString(),
              orgsContributing: orgs.length,
              activeUsers,
              metricsPublished: METRICS.filter(
                (m) => computed[m].perOrgValues.length >= MIN_ORGS_PER_INDUSTRY,
              ),
            },
          },
        });
      } catch (err) {
        // Audit failures must never block the aggregation result.
        log.warn('compute-industry-benchmarks: audit write failed', {
          industry,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      industriesSuppressed += 1;
    }
  }

  log.info('compute-industry-benchmarks: completed', {
    industriesInspected,
    industriesPublished,
    industriesSuppressed,
    snapshotsWritten,
  });

  return {
    industriesInspected,
    industriesPublished,
    industriesSuppressed,
    snapshotsWritten,
  };
}
