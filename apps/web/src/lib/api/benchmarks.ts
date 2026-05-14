import { apiGet, apiPatch } from './client';

// ---------------------------------------------------------------------------
// Mirrored response types — see apps/api/src/modules/benchmarks/dto.
// Keeping these inline avoids forcing the @levelup/types build to track the
// API surface; the API is the source of truth.
// ---------------------------------------------------------------------------

export const BENCHMARK_METRICS = [
  'lesson_completion_rate',
  'lab_pass_rate',
  'daily_active_rate',
] as const;

export type BenchmarkMetric = (typeof BENCHMARK_METRICS)[number];

export type BenchmarkBucket = '<p25' | 'p25-p50' | 'p50-p75' | 'p75-p90' | '>p90';

export interface BenchmarkMetricResult {
  metric: BenchmarkMetric;
  sampleSize: number;
  userSample: number;
  period: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  yourValue: number | null;
  yourBucket: BenchmarkBucket | null;
}

export interface BenchmarkSuppression {
  metric: BenchmarkMetric;
  reason: 'opted_out' | 'insufficient_peers' | 'no_data';
}

export interface BenchmarkMeResponse {
  industry: string | null;
  optedOut: boolean;
  available: BenchmarkMetricResult[];
  suppressed: BenchmarkSuppression[];
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getMyBenchmarks(): Promise<BenchmarkMeResponse> {
  return apiGet<BenchmarkMeResponse>('/benchmarks/me');
}

export async function setBenchmarkOptOut(optOut: boolean): Promise<{ optedOut: boolean }> {
  return apiPatch<{ optOut: boolean }, { optedOut: boolean }>('/orgs/me/benchmark-opt-out', {
    optOut,
  });
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

const METRIC_LABEL: Record<BenchmarkMetric, string> = {
  lesson_completion_rate: 'Lesson completion rate',
  lab_pass_rate: 'Lab pass rate (first attempt)',
  daily_active_rate: 'Daily active rate',
};

const METRIC_DESCRIPTION: Record<BenchmarkMetric, string> = {
  lesson_completion_rate: 'Share of assigned lessons completed in the last 30 days.',
  lab_pass_rate: 'Share of lab attempts that passed on the first try in the last 30 days.',
  daily_active_rate: 'Share of org users with any activity yesterday.',
};

const BUCKET_LABEL: Record<BenchmarkBucket, string> = {
  '<p25': 'bottom 25%',
  'p25-p50': '25th–50th percentile',
  'p50-p75': '50th–75th percentile',
  'p75-p90': '75th–90th percentile',
  '>p90': 'top 10%',
};

export function metricLabel(m: BenchmarkMetric): string {
  return METRIC_LABEL[m];
}

export function metricDescription(m: BenchmarkMetric): string {
  return METRIC_DESCRIPTION[m];
}

export function bucketLabel(b: BenchmarkBucket): string {
  return BUCKET_LABEL[b];
}
