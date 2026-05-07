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
      {/* Period pills */}
      <div className="flex rounded-lg border border-border bg-muted/30 p-1 gap-1">
        {PERIOD_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => onPeriodChange(value)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              period === value
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date range inputs */}
      {period === 'custom' && (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomChange?.(e.target.value, customEnd)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
            aria-label="Start date"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomChange?.(customStart, e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
            aria-label="End date"
          />
        </div>
      )}

      <div className="flex-1" />

      {/* Export button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export CSV
      </Button>
    </div>
  );
}
