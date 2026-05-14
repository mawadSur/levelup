import Link from 'next/link';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import {
  bucketLabel,
  metricDescription,
  metricLabel,
  type BenchmarkMeResponse,
  type BenchmarkMetricResult,
} from '@/lib/api/benchmarks';

interface IndustryBenchmarkCardProps {
  data: BenchmarkMeResponse;
}

export function IndustryBenchmarkCard({ data }: IndustryBenchmarkCardProps) {
  const empty = data.available.length === 0;

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <header className="space-y-1">
          <MonoLabel>INDUSTRY BENCHMARK</MonoLabel>
          <p className="text-body-sm text-paper-300">
            {data.industry
              ? `Privacy-preserved quantiles across opted-in orgs in ${data.industry}. Updated weekly.`
              : 'Set your industry under org settings to unlock peer benchmarks.'}
          </p>
        </header>

        {empty ? (
          <EmptyState optedOut={data.optedOut} />
        ) : (
          <ul className="space-y-6">
            {data.available.map((metric) => (
              <li key={metric.metric}>
                <BenchmarkRow metric={metric} />
              </li>
            ))}
          </ul>
        )}

        <p className="font-mono text-mono-xs uppercase tracking-[0.05em] text-paper-500">
          Minimum 10 peer organisations + 100 active users per industry slice before any value is
          shown. Your org&apos;s data is contributed in aggregate quantiles only.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ optedOut }: { optedOut: boolean }) {
  return (
    <div className="space-y-3 rounded-data border border-dashed border-ink-600 bg-ink-900/60 p-6 text-body-sm text-paper-300">
      <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        {optedOut ? 'OPTED OUT' : 'INSUFFICIENT PEER DATA YET'}
      </p>
      <p>
        {optedOut
          ? 'Your organisation has opted out of cross-tenant benchmarking. Snapshots resume next week once you opt back in.'
          : 'Need 10+ peer organisations in your industry (and 100+ active users) before any quantile can be exposed. Check back next Monday.'}
      </p>
      <p>
        <Link
          href="/admin/settings#benchmark"
          className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal underline-offset-4 hover:underline"
        >
          Manage participation →
        </Link>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One metric row — value as vertical line on a p25..p90 band, p50 marked.
// ---------------------------------------------------------------------------

function BenchmarkRow({ metric }: { metric: BenchmarkMetricResult }) {
  // The band axis spans p25..p90 inclusive. We map any value (including the
  // caller's, which may sit below p25 or above p90) into that scale, clamping
  // to a tiny visible margin so out-of-range markers still render at the edge.
  const min = metric.p25;
  const max = metric.p90;
  const range = Math.max(max - min, 0.0001);
  const xFor = (v: number): number => {
    const pct = ((v - min) / range) * 100;
    return Math.min(100, Math.max(0, pct));
  };

  const p50Pos = xFor(metric.p50);
  const p75Pos = xFor(metric.p75);
  const yourPos = metric.yourValue !== null ? xFor(metric.yourValue) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="space-y-0.5">
          <p className="font-medium text-paper-100">{metricLabel(metric.metric)}</p>
          <p className="text-body-sm text-paper-300">{metricDescription(metric.metric)}</p>
        </div>
        <div className="text-right">
          {metric.yourValue !== null && metric.yourBucket ? (
            <>
              <p className="font-mono text-mono-sm tabular-nums text-paper-100">
                {formatPct(metric.yourValue)}
              </p>
              <p className="font-mono text-mono-xs uppercase tracking-[0.05em] text-paper-500">
                {bucketLabel(metric.yourBucket)}
              </p>
            </>
          ) : (
            <p className="font-mono text-mono-xs uppercase tracking-[0.05em] text-paper-500">
              No data for your org
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div
          className="relative h-6 rounded-data bg-ink-800"
          role="img"
          aria-label={`${metricLabel(metric.metric)} distribution`}
        >
          {/* p25..p75 inter-quartile band */}
          <div
            className="absolute inset-y-0 rounded-data bg-signal/15"
            style={{
              left: `${xFor(metric.p25)}%`,
              width: `${Math.max(p75Pos - xFor(metric.p25), 1)}%`,
            }}
          />
          {/* p75..p90 extension */}
          <div
            className="absolute inset-y-0 bg-signal/8"
            style={{
              left: `${p75Pos}%`,
              width: `${Math.max(xFor(metric.p90) - p75Pos, 1)}%`,
            }}
          />
          {/* p50 marker */}
          <div
            className="absolute inset-y-0 w-px bg-paper-300"
            style={{ left: `${p50Pos}%` }}
            aria-label={`median ${formatPct(metric.p50)}`}
          />
          {/* Your-org marker */}
          {yourPos !== null ? (
            <div
              className="absolute inset-y-[-2px] w-[2px] rounded-full bg-signal"
              style={{ left: `${yourPos}%` }}
              aria-label={`your org ${formatPct(metric.yourValue ?? 0)}`}
            />
          ) : null}
        </div>
        <div className="flex justify-between font-mono text-mono-xs uppercase tracking-[0.05em] text-paper-500">
          <span>p25 {formatPct(metric.p25)}</span>
          <span>p50 {formatPct(metric.p50)}</span>
          <span>p75 {formatPct(metric.p75)}</span>
          <span>p90 {formatPct(metric.p90)}</span>
        </div>
      </div>

      <p className="font-mono text-mono-xs uppercase tracking-[0.05em] text-paper-500">
        Sample: {metric.sampleSize} peers · {metric.userSample} users
      </p>
    </div>
  );
}

function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
