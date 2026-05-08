'use client';

import * as React from 'react';
import { Calendar, Download, Loader2 } from 'lucide-react';
import { Button } from '@levelup/ui';
import { reports } from '@/lib/api';

export type Period = '7d' | '30d' | '90d' | 'custom';

interface PeriodSelectorProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  customStart?: string;
  customEnd?: string;
  onCustomChange?: (start: string, end: string) => void;
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Custom', value: 'custom' },
];

export function PeriodSelector({
  period,
  onPeriodChange,
  customStart = '',
  customEnd = '',
  onCustomChange,
}: PeriodSelectorProps) {
  const [exporting, setExporting] = React.useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const filters =
        period === 'custom' && customStart && customEnd
          ? { startDate: new Date(customStart), endDate: new Date(customEnd) }
          : period === '7d'
            ? { startDate: new Date(Date.now() - 7 * 86_400_000) }
            : period === '30d'
              ? { startDate: new Date(Date.now() - 30 * 86_400_000) }
              : period === '90d'
                ? { startDate: new Date(Date.now() - 90 * 86_400_000) }
                : {};

      const blob = await reports.exportCsv(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `levelup-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail for now
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period pills — sharp data-radius mono row */}
      <div className="flex gap-0 overflow-hidden rounded-data border border-ink-600">
        {PERIOD_OPTIONS.map(({ label, value }, idx) => (
          <button
            key={value}
            type="button"
            onClick={() => onPeriodChange(value)}
            className={`relative px-3 py-1.5 font-mono text-mono-sm uppercase tracking-[0.05em] transition-colors ${
              idx > 0 ? 'border-l border-ink-600' : ''
            } ${
              period === value
                ? 'bg-signal text-ink-900'
                : 'bg-ink-800 text-paper-300 hover:bg-ink-700 hover:text-paper-100'
            }`}
          >
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Custom date range inputs */}
      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-paper-500" aria-hidden="true" />
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomChange?.(e.target.value, customEnd)}
            className="rounded-sm border border-ink-500 bg-transparent px-2 py-1 font-mono text-mono-sm text-paper-100"
            aria-label="Start date"
          />
          <span className="font-mono text-mono-sm text-paper-500">—</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomChange?.(customStart, e.target.value)}
            className="rounded-sm border border-ink-500 bg-transparent px-2 py-1 font-mono text-mono-sm text-paper-100"
            aria-label="End date"
          />
        </div>
      )}

      <div className="flex-1" />

      <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="font-mono text-mono-sm uppercase tracking-[0.05em]">EXPORT CSV</span>
      </Button>
    </div>
  );
}
