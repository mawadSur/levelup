'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, MissionNumber, MonoLabel } from '@levelup/ui';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  /** @deprecated kept for back-compat; ignored in Mission Brief styling. */
  iconClassName?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  cta?: ReactNode;
  className?: string;
  /**
   * Formats the value via MissionNumber when `value` is a number. Defaults to `integer`.
   * Pass a string `value` (e.g. "—") to bypass formatting.
   */
  format?: 'integer' | 'percent' | 'currency' | 'compact';
}

export function StatCard({
  title,
  value,
  sublabel,
  icon: Icon,
  trend,
  cta,
  className,
  format = 'integer',
}: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : Number.NaN;
  const isNumeric = Number.isFinite(numericValue);

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <MonoLabel className="block">{title.toUpperCase()}</MonoLabel>
          {Icon && <Icon className="h-4 w-4 shrink-0 text-paper-500" aria-hidden="true" />}
        </div>
        <div className="font-serif text-display-md tabular-nums text-paper-100">
          {isNumeric ? <MissionNumber value={numericValue} format={format} /> : value}
        </div>
        {sublabel && <p className="text-body-sm text-paper-300">{sublabel}</p>}
        {trend && (
          <p
            className={cn(
              'font-mono text-mono-sm uppercase tracking-[0.05em]',
              trend.direction === 'up' && 'text-success',
              trend.direction === 'down' && 'text-danger',
              trend.direction === 'neutral' && 'text-paper-300',
            )}
          >
            {trend.label}
          </p>
        )}
        {cta && <div className="pt-1">{cta}</div>}
      </CardContent>
    </Card>
  );
}
