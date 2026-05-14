import { z } from 'zod';

// ---------------------------------------------------------------------------
// PATCH /orgs/me/benchmark-opt-out
// ---------------------------------------------------------------------------

export const updateBenchmarkOptOutSchema = z.object({
  /** When true, the org is excluded from cross-tenant aggregates. */
  optOut: z.boolean(),
});

export type UpdateBenchmarkOptOutDto = z.infer<typeof updateBenchmarkOptOutSchema>;

// ---------------------------------------------------------------------------
// Response shapes (mirrored in apps/web for type-sharing without a build dep)
// ---------------------------------------------------------------------------

/** v1 metrics. `incident_rate` is deferred until DP review. */
export const BENCHMARK_METRICS = [
  'lesson_completion_rate',
  'lab_pass_rate',
  'daily_active_rate',
] as const;

export type BenchmarkMetric = (typeof BENCHMARK_METRICS)[number];

export interface BenchmarkMetricResult {
  metric: BenchmarkMetric;
  /** Number of orgs contributing to the slice; >= 10 if present. */
  sampleSize: number;
  /** Number of distinct contributing users across the slice. */
  userSample: number;
  /** ISO timestamp of the snapshot's period (most recent ISO-week Monday). */
  period: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  /**
   * The caller org's own value for this metric (0..1) — null if the org has
   * opted out OR if the org has no contributing data for the period.
   */
  yourValue: number | null;
  /**
   * Bucket the caller falls into. One of '<p25' | 'p25-p50' | 'p50-p75' |
   * 'p75-p90' | '>p90'. Null when `yourValue` is null.
   */
  yourBucket: BenchmarkBucket | null;
}

export type BenchmarkBucket = '<p25' | 'p25-p50' | 'p50-p75' | 'p75-p90' | '>p90';

export interface BenchmarkSuppression {
  metric: BenchmarkMetric;
  /** Why the metric is hidden — keeps the UI copy honest. */
  reason: 'opted_out' | 'insufficient_peers' | 'no_data';
}

export interface BenchmarkMeResponse {
  industry: string | null;
  optedOut: boolean;
  /** Snapshots that passed the privacy floor and have a value for the caller. */
  available: BenchmarkMetricResult[];
  /** Metrics deliberately withheld, with a machine-readable reason. */
  suppressed: BenchmarkSuppression[];
}
