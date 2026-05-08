'use client';

import { useState, useCallback } from 'react';
import type { UsageTrendBucket } from '@levelup/types';
import { Card, CardContent, MonoLabel } from '@levelup/ui';

interface UsageTrendCardProps {
  buckets: UsageTrendBucket[];
}

// ---------------------------------------------------------------------------
// Mission Brief palette — signal-amber primary, paper-300 for the secondary line.
// ---------------------------------------------------------------------------
const SERIES = [
  {
    key: 'coachInvocations' as const,
    label: 'Coach sessions',
    color: 'rgb(255 179 0)', // signal
    strokeWidth: 2,
  },
  {
    key: 'lessonsCompleted' as const,
    label: 'Lessons completed',
    color: 'rgb(169 166 160)', // paper-300
    strokeWidth: 2,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildPolylinePoints(
  values: number[],
  max: number,
  viewW: number,
  viewH: number,
  padding: { top: number; right: number; bottom: number; left: number },
): string {
  if (values.length < 2) return '';
  const plotW = viewW - padding.left - padding.right;
  const plotH = viewH - padding.top - padding.bottom;
  const safeMax = max === 0 ? 1 : max;

  return values
    .map((v, i) => {
      const x = padding.left + (i / (values.length - 1)) * plotW;
      const y = padding.top + plotH - (v / safeMax) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// HoverOverlay — extracted sub-component so TypeScript can narrow hov/hovX
// ---------------------------------------------------------------------------

interface HoverOverlayProps {
  hovX: number;
  hov: UsageTrendBucket;
  maxValue: number;
  viewW: number;
  padTop: number;
  plotH: number;
  padRight: number;
}

function HoverOverlay({ hovX, hov, maxValue, viewW, padTop, plotH, padRight }: HoverOverlayProps) {
  const boxW = 180;
  const boxH = 72;
  const boxPad = 8;
  const rawX = hovX + 10;
  const clampedX = Math.min(rawX, viewW - padRight - boxW - boxPad);
  const safeMax = maxValue === 0 ? 1 : maxValue;

  return (
    <>
      {/* Vertical rule */}
      <line
        x1={hovX}
        y1={padTop}
        x2={hovX}
        y2={padTop + plotH}
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={1}
        strokeDasharray="4 2"
      />

      {/* Dots on each series */}
      {SERIES.map((s) => {
        const value = hov[s.key];
        const y = padTop + plotH - (value / safeMax) * plotH;
        return (
          <circle
            key={s.key}
            cx={hovX}
            cy={y}
            r={4}
            fill={s.color}
            stroke="white"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Tooltip box */}
      <g transform={`translate(${clampedX}, ${padTop + 8})`}>
        <rect
          width={boxW}
          height={boxH}
          rx={4}
          fill="rgb(14 16 25)"
          stroke="rgb(34 40 56)"
          strokeWidth={1}
        />
        <text
          x={boxPad}
          y={18}
          fontSize={10}
          fontFamily="var(--font-geist-mono), ui-monospace, monospace"
          letterSpacing={0.5}
          fill="rgb(169 166 160)"
          fontWeight={500}
        >
          {formatDayLabel(hov.bucketStart).toUpperCase()}
        </text>
        {SERIES.map((s, si) => (
          <g key={s.key} transform={`translate(${boxPad}, ${30 + si * 18})`}>
            <rect width={8} height={8} rx={2} fill={s.color} y={-7} />
            <text x={12} fontSize={11} fill="currentColor" fillOpacity={0.8}>
              {s.label}: <tspan fontWeight={700}>{hov[s.key]}</tspan>
            </text>
          </g>
        ))}
      </g>
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsageTrendCard({ buckets }: UsageTrendCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (buckets.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const plotLeft = 40;
      const plotRight = rect.width - 12;
      const plotW = plotRight - plotLeft;
      const frac = Math.max(0, Math.min(1, (relX - plotLeft) / plotW));
      const idx = Math.round(frac * (buckets.length - 1));
      setHoveredIndex(idx);
    },
    [buckets],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (buckets.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6">
          <MonoLabel>USAGE TREND</MonoLabel>
          <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            NO ACTIVITY DATA YET FOR THIS PERIOD
          </p>
        </CardContent>
      </Card>
    );
  }

  // Chart dimensions
  const VIEW_W = 800;
  const VIEW_H = 300;
  const PAD = { top: 16, right: 12, bottom: 32, left: 40 };
  const PLOT_W = VIEW_W - PAD.left - PAD.right;
  const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

  const allValues = SERIES.flatMap((s) => buckets.map((b) => b[s.key]));
  const maxValue = Math.max(...allValues, 1);

  // X-axis labels: show up to 8 evenly-spaced ticks
  const labelStep = Math.max(1, Math.ceil(buckets.length / 8));
  const xLabels = buckets
    .map((b, i) => ({ i, label: formatDayLabel(b.bucketStart) }))
    .filter(({ i }) => i % labelStep === 0);

  // Hovered bucket tooltip data
  const hov = hoveredIndex !== null ? (buckets[hoveredIndex] ?? null) : null;
  const hovX =
    hoveredIndex !== null ? PAD.left + (hoveredIndex / (buckets.length - 1)) * PLOT_W : null;

  return (
    <Card>
      <CardContent className="space-y-3 px-6 pt-6">
        <div className="flex items-center justify-between gap-4">
          <MonoLabel>USAGE TREND · 30 DAYS</MonoLabel>
          <div className="flex flex-wrap items-center gap-4">
            {SERIES.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-1.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300"
              >
                <span
                  className="inline-block h-0.5 w-5"
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
                {s.label.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardContent className="px-2 pb-4 pt-0">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto select-none"
          aria-label="Usage trend line chart"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'crosshair' }}
        >
          {/* Y-axis gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = PAD.top + PLOT_H - frac * PLOT_H;
            return (
              <g key={frac}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={VIEW_W - PAD.right}
                  y2={y}
                  stroke="rgb(34 40 56)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 4}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={9}
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  letterSpacing={0.5}
                  fill="rgb(92 90 86)"
                >
                  {Math.round(maxValue * frac)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {xLabels.map(({ i, label }) => {
            const x = PAD.left + (i / (buckets.length - 1)) * PLOT_W;
            return (
              <text
                key={i}
                x={x}
                y={VIEW_H - 4}
                textAnchor="middle"
                fontSize={9}
                fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                letterSpacing={0.5}
                fill="rgb(92 90 86)"
              >
                {label.toUpperCase()}
              </text>
            );
          })}

          {/* Series polylines */}
          {SERIES.map((s) => {
            const values = buckets.map((b) => b[s.key]);
            const points = buildPolylinePoints(values, maxValue, VIEW_W, VIEW_H, PAD);
            return (
              <polyline
                key={s.key}
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={s.strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}

          {/* Hover crosshair */}
          {hovX !== null && hov !== null && (
            <HoverOverlay
              hovX={hovX}
              hov={hov}
              maxValue={maxValue}
              viewW={VIEW_W}
              padTop={PAD.top}
              plotH={PLOT_H}
              padRight={PAD.right}
            />
          )}
        </svg>
      </CardContent>
    </Card>
  );
}
