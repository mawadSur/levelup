import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, GridLines, MissionNumber, MonoLabel } from '@levelup/ui';

export function Hero() {
  return (
    <section className="relative grain overflow-hidden border-b border-ink-600 bg-ink-900">
      <GridLines />

      <div className="relative mx-auto max-w-content px-6 pb-12 pt-6 sm:pt-8 lg:px-8 lg:pb-16 lg:pt-10">
        {/* Eyebrow */}
        <div className="mb-6 flex items-baseline gap-4 animate-mission-in lg:mb-8">
          <MonoLabel className="text-paper-500">MISSION BRIEF / VOL. I</MonoLabel>
          <span className="h-px flex-1 max-w-[12rem] bg-ink-500" aria-hidden />
          <MonoLabel tone="signal">2026.05 · ENROLLMENT OPEN</MonoLabel>
        </div>

        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[3fr,2fr] lg:gap-12">
          {/* Headline column */}
          <div className="animate-mission-in delay-75">
            <h1 className="font-serif text-display-lg text-paper-100">
              Train every operator to use AI{' '}
              <em className="font-serif italic text-signal">safely</em>,{' '}
              <em className="font-serif italic text-paper-100">effectively</em>, and measurably.
            </h1>

            <p className="mt-6 max-w-reading text-body-lg text-paper-300">
              A role-based curriculum, an in-context coach, and a reporting instrument your CIO will
              actually open. Pilot in thirty days, prove the ROI by week three.
            </p>

            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="primary" size="lg">
                <Link href="/sign-up">REQUEST DEMO →</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="#how-it-works">SEE THE INSTRUMENT</Link>
              </Button>
            </div>

            <p className="mt-4 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              NO PROCUREMENT · 14-DAY TRIAL · CANCEL ANY TIME
            </p>
          </div>

          {/* Telemetry card */}
          <TelemetryCard />
        </div>
      </div>
    </section>
  );
}

function TelemetryCard() {
  const rows: Array<{
    idx: string;
    label: string;
    value: ReactNode;
    tone: 'signal' | 'success' | 'default';
    status: string;
  }> = [
    {
      idx: '01',
      label: 'AI POLICY',
      value: <MissionNumber value={0.98} format="percent" />,
      tone: 'signal',
      status: 'ENFORCED',
    },
    {
      idx: '02',
      label: 'COACH',
      value: 'ACTIVE',
      tone: 'success',
      status: 'STREAMING',
    },
    {
      idx: '03',
      label: 'COMPLETION',
      value: <MissionNumber value={0.84} format="percent" />,
      tone: 'default',
      status: 'Q2 RUN',
    },
    {
      idx: '04',
      label: 'RISK FLAGS',
      value: '00',
      tone: 'success',
      status: 'CLEAR',
    },
    {
      idx: '05',
      label: 'CERTIFICATES',
      value: <MissionNumber value={1248} format="integer" />,
      tone: 'default',
      status: 'ISSUED',
    },
  ];

  return (
    <div className="animate-mission-in delay-150 rounded-md border border-ink-600 bg-ink-800 p-6 lg:p-7">
      {/* Card header */}
      <div className="mb-6 flex items-center justify-between border-b border-ink-600 pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-signal" aria-hidden />
          <MonoLabel className="text-paper-300">TELEMETRY · LIVE</MonoLabel>
        </div>
        <MonoLabel className="text-paper-500">14:22 UTC</MonoLabel>
      </div>

      <ul className="space-y-1">
        {rows.map((row) => (
          <li
            key={row.idx}
            className="grid grid-cols-[auto,1fr,auto] items-baseline gap-4 border-b border-ink-700 py-3 last:border-b-0"
          >
            <span className="font-mono text-mono-sm tabular-nums text-paper-500">[{row.idx}]</span>
            <div>
              <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-100">
                {row.label}
              </p>
              <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                {row.status}
              </p>
            </div>
            <span
              className={[
                'font-serif text-2xl tabular-nums',
                row.tone === 'signal' && 'text-signal',
                row.tone === 'success' && 'text-success',
                row.tone === 'default' && 'text-paper-100',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-ink-600 pt-4">
        <MonoLabel className="text-paper-500">
          SAMPLE READOUT · DASHBOARD AVAILABLE POST-PILOT
        </MonoLabel>
      </div>
    </div>
  );
}
