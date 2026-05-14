/**
 * BenchmarksService — cross-tenant industry benchmarks (privacy-preserved).
 *
 * Privacy contract (defence-in-depth):
 *   - The worker only writes snapshots when the slice clears the floor.
 *   - This service re-checks the floor on every read AND additionally
 *     verifies the caller org is opted in. A malicious admin who somehow
 *     queries the raw snapshot table directly would still see suppressed
 *     metrics if the floor isn't met or their org has opted out.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type { SessionPayload } from '@levelup/auth-client';
import {
  BENCHMARK_METRICS,
  type BenchmarkBucket,
  type BenchmarkMeResponse,
  type BenchmarkMetric,
  type BenchmarkMetricResult,
  type BenchmarkSuppression,
} from './dto/benchmarks.dto';

// ---------------------------------------------------------------------------
// Privacy floor — DUPLICATED here intentionally. The worker enforces it on
// write; the API re-checks on read so any direct DB tampering or schema
// drift cannot silently expose a thin slice.
// ---------------------------------------------------------------------------
const MIN_ORGS_PER_INDUSTRY = 10;
const METRIC_WINDOW_DAYS = 30;
const DAILY_ACTIVE_WINDOW_HOURS = 24;

interface CallerMetricRow {
  metric: BenchmarkMetric;
  value: number | null;
}

@Injectable()
export class BenchmarksService {
  private readonly logger = new Logger(BenchmarksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // GET /benchmarks/me
  // --------------------------------------------------------------------------

  async getForMyOrg(user: SessionPayload): Promise<BenchmarkMeResponse> {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, industry: true, benchmarkOptOut: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    // If the org has opted out OR has no industry tagged, every metric is
    // suppressed. We still return the envelope so the UI can render an empty
    // state with the correct reason.
    if (org.benchmarkOptOut || !org.industry) {
      return {
        industry: org.industry,
        optedOut: org.benchmarkOptOut,
        available: [],
        suppressed: BENCHMARK_METRICS.map((metric) => ({
          metric,
          reason: org.benchmarkOptOut ? 'opted_out' : 'insufficient_peers',
        })),
      };
    }

    // Pull the latest snapshot per metric for the caller's industry.
    const snapshots = await this.prisma.industryBenchmarkSnapshot.findMany({
      where: { industry: org.industry, metric: { in: [...BENCHMARK_METRICS] } },
      orderBy: { period: 'desc' },
    });

    // Pick the freshest row per metric.
    const latestByMetric = new Map<BenchmarkMetric, (typeof snapshots)[number]>();
    for (const s of snapshots) {
      const metric = s.metric as BenchmarkMetric;
      if (!BENCHMARK_METRICS.includes(metric)) continue;
      if (!latestByMetric.has(metric)) latestByMetric.set(metric, s);
    }

    const callerValues = await this.computeCallerValues(org.id);

    const available: BenchmarkMetricResult[] = [];
    const suppressed: BenchmarkSuppression[] = [];

    for (const metric of BENCHMARK_METRICS) {
      const snap = latestByMetric.get(metric);
      // Defence-in-depth: re-check the per-metric sample-size floor at read
      // time. If a snapshot is below threshold (should never happen since the
      // worker enforces this), we still hide it.
      if (!snap || snap.sampleSize < MIN_ORGS_PER_INDUSTRY) {
        suppressed.push({ metric, reason: 'insufficient_peers' });
        continue;
      }

      const yourValue = callerValues.get(metric) ?? null;
      const yourBucket = yourValue === null ? null : bucketFor(yourValue, snap);

      available.push({
        metric,
        sampleSize: snap.sampleSize,
        userSample: snap.userSample,
        period: snap.period.toISOString(),
        p25: snap.p25,
        p50: snap.p50,
        p75: snap.p75,
        p90: snap.p90,
        yourValue,
        yourBucket,
      });
    }

    return {
      industry: org.industry,
      optedOut: false,
      available,
      suppressed,
    };
  }

  // --------------------------------------------------------------------------
  // PATCH /orgs/me/benchmark-opt-out
  // --------------------------------------------------------------------------

  async setOptOut(user: SessionPayload, optOut: boolean): Promise<{ optedOut: boolean }> {
    const before = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { benchmarkOptOut: true },
    });
    if (!before) throw new NotFoundException('Organization not found');

    if (before.benchmarkOptOut === optOut) {
      return { optedOut: optOut };
    }

    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: { benchmarkOptOut: optOut },
    });

    // Best-effort audit; never block the toggle on audit write failures.
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          actorId: user.userId,
          action: 'org.benchmark_opt_out_changed',
          targetType: 'Organization',
          targetId: user.organizationId,
          metadata: {
            previous: before.benchmarkOptOut,
            next: optOut,
          },
        },
      });
    } catch (err) {
      this.logger.warn(
        `org.benchmark_opt_out_changed audit failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { optedOut: optOut };
  }

  // --------------------------------------------------------------------------
  // Helpers — compute the caller org's value for each metric on-the-fly.
  // We keep the same definitions as the worker to ensure "your org" lines up
  // with the published quantile distribution.
  // --------------------------------------------------------------------------

  private async computeCallerValues(orgId: string): Promise<Map<BenchmarkMetric, number>> {
    const windowStart = new Date(Date.now() - METRIC_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [completion, labs, dau] = await Promise.all([
      this.callerLessonCompletionRate(orgId, windowStart),
      this.callerLabPassRate(orgId, windowStart),
      this.callerDailyActiveRate(orgId),
    ]);

    const out = new Map<BenchmarkMetric, number>();
    const rows: CallerMetricRow[] = [
      { metric: 'lesson_completion_rate', value: completion },
      { metric: 'lab_pass_rate', value: labs },
      { metric: 'daily_active_rate', value: dau },
    ];
    for (const r of rows) {
      if (r.value !== null && Number.isFinite(r.value)) out.set(r.metric, r.value);
    }
    return out;
  }

  private async callerLessonCompletionRate(
    orgId: string,
    windowStart: Date,
  ): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<Array<{ numerator: bigint; denominator: bigint }>>`
      WITH eligible AS (
        SELECT up.status
        FROM user_progress up
        JOIN users u ON u.id = up."userId"
        WHERE u."organizationId" = ${orgId}
          AND (up."completedAt" >= ${windowStart} OR up.status <> 'COMPLETED')
      )
      SELECT
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::bigint AS numerator,
        COUNT(*)::bigint                                     AS denominator
      FROM eligible
    `;
    const r = rows[0];
    if (!r) return null;
    const denom = Number(r.denominator);
    if (denom === 0) return null;
    return Number(r.numerator) / denom;
  }

  private async callerLabPassRate(orgId: string, windowStart: Date): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<Array<{ numerator: bigint; denominator: bigint }>>`
      WITH first_attempts AS (
        SELECT DISTINCT ON ("userId", "labId")
          passed
        FROM lab_attempts
        WHERE "organizationId" = ${orgId}
          AND "createdAt" >= ${windowStart}
        ORDER BY "userId", "labId", "createdAt" ASC
      )
      SELECT
        COUNT(*) FILTER (WHERE passed)::bigint AS numerator,
        COUNT(*)::bigint                       AS denominator
      FROM first_attempts
    `;
    const r = rows[0];
    if (!r) return null;
    const denom = Number(r.denominator);
    if (denom === 0) return null;
    return Number(r.numerator) / denom;
  }

  private async callerDailyActiveRate(orgId: string): Promise<number | null> {
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const yesterdayStart = new Date(
      todayStart.getTime() - DAILY_ACTIVE_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const rows = await this.prisma.$queryRaw<Array<{ active: bigint; total: bigint }>>`
      SELECT
        (
          SELECT COUNT(DISTINCT up."userId")::bigint
          FROM user_progress up
          JOIN users u ON u.id = up."userId"
          WHERE u."organizationId" = ${orgId}
            AND up."completedAt" >= ${yesterdayStart}
            AND up."completedAt" < ${todayStart}
        ) AS active,
        (
          SELECT COUNT(*)::bigint
          FROM users
          WHERE "organizationId" = ${orgId}
        ) AS total
    `;
    const r = rows[0];
    if (!r) return null;
    const total = Number(r.total);
    if (total === 0) return null;
    return Number(r.active) / total;
  }
}

function bucketFor(
  value: number,
  snap: { p25: number; p50: number; p75: number; p90: number },
): BenchmarkBucket {
  if (value < snap.p25) return '<p25';
  if (value < snap.p50) return 'p25-p50';
  if (value < snap.p75) return 'p50-p75';
  if (value < snap.p90) return 'p75-p90';
  return '>p90';
}
