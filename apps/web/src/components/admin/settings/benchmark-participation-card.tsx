'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import { setBenchmarkOptOut } from '@/lib/api/benchmarks';

interface BenchmarkParticipationCardProps {
  /** Current value of Organization.benchmarkOptOut. */
  initialOptOut: boolean;
}

export function BenchmarkParticipationCard({ initialOptOut }: BenchmarkParticipationCardProps) {
  const [optOut, setOptOut] = useState(initialOptOut);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // The UI is framed as "participate?", so participating = !optOut.
  const participating = !optOut;

  function toggle(): void {
    if (pending) return;
    setError(null);
    const next = !optOut;
    setOptOut(next); // optimistic
    startTransition(async () => {
      try {
        await setBenchmarkOptOut(next);
        router.refresh();
      } catch (err) {
        setOptOut(optOut); // rollback
        setError(err instanceof Error ? err.message : 'Failed to update preference');
      }
    });
  }

  return (
    <Card id="benchmark">
      <CardContent className="space-y-5 p-6">
        <header className="space-y-1">
          <MonoLabel>BENCHMARK PARTICIPATION</MonoLabel>
          <p className="max-w-reading text-body-sm text-paper-300">
            Participate in privacy-preserved industry benchmarks. Your org&apos;s data is included
            in aggregate quantiles only; no individual or org-level data is exposed.
          </p>
        </header>

        <div className="flex items-center justify-between gap-6 rounded-data border border-ink-600 bg-ink-900/60 p-4">
          <div className="space-y-1">
            <p className="font-medium text-paper-100">
              {participating ? 'Participating' : 'Opted out'}
            </p>
            <p className="text-body-sm text-paper-300">
              {participating
                ? 'Your org contributes to quantiles in your industry. You can also see how you compare on the Insights page.'
                : 'Your org is excluded from cross-tenant aggregates and the comparison view is hidden until you opt back in.'}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={participating}
            aria-label="Participate in industry benchmarks"
            onClick={toggle}
            disabled={pending}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              participating ? 'border-signal/60 bg-signal/30' : 'border-ink-600 bg-ink-800'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-5 w-5 transform rounded-full bg-paper-100 transition-transform ${
                participating ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {error ? (
          <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-red-400">{error}</p>
        ) : null}

        <p className="font-mono text-mono-xs uppercase tracking-[0.05em] text-paper-500">
          Minimum 10 peer organisations + 100 active users per industry slice before any value is
          published. Changes take effect on the next weekly aggregation (Mondays, 02:00 UTC).
        </p>
      </CardContent>
    </Card>
  );
}
