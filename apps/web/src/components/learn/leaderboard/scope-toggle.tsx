'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { cn } from '@levelup/ui';
import type { LeaderboardPeriod, LeaderboardScope } from '@levelup/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ScopeToggleProps {
  currentPeriod: LeaderboardPeriod;
  currentScope: LeaderboardScope;
  /** Only shown when the user belongs to a department. */
  hasDepartment?: boolean;
}

// ---------------------------------------------------------------------------
// Button group sub-component
// ---------------------------------------------------------------------------
interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

function SegmentGroup<T extends string>({
  options,
  current,
  groupId,
  onChange,
}: {
  options: SegmentOption<T>[];
  current: T;
  groupId: string;
  onChange: (value: T) => void;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="group">
      {options.map((opt) => {
        const isActive = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {isActive && !prefersReduced && (
              <motion.span
                layoutId={`seg-active-${groupId}`}
                className="absolute inset-0 rounded-md bg-background shadow-sm"
                style={{ zIndex: -1 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            {isActive && prefersReduced && (
              <span
                className="absolute inset-0 rounded-md bg-background shadow-sm"
                style={{ zIndex: -1 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
            {isActive && (
              <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScopeToggle
// ---------------------------------------------------------------------------
const PERIOD_OPTIONS: SegmentOption<LeaderboardPeriod>[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

const SCOPE_OPTIONS: SegmentOption<LeaderboardScope>[] = [
  { value: 'org', label: 'Org' },
  { value: 'department', label: 'Department' },
];

export function ScopeToggle({
  currentPeriod,
  currentScope,
  hasDepartment = false,
}: ScopeToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(scope: LeaderboardScope, period: LeaderboardPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('scope', scope);
    params.set('period', period);
    router.push(`/leaderboard?${params.toString()}`);
  }

  function handlePeriodChange(period: LeaderboardPeriod) {
    navigate(currentScope, period);
  }

  function handleScopeChange(scope: LeaderboardScope) {
    navigate(scope, currentPeriod);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period selector */}
      <SegmentGroup
        options={PERIOD_OPTIONS}
        current={currentPeriod}
        groupId="period"
        onChange={handlePeriodChange}
      />

      {/* Scope selector — only visible when user has a department */}
      {hasDepartment && (
        <SegmentGroup
          options={SCOPE_OPTIONS}
          current={currentScope}
          groupId="scope"
          onChange={handleScopeChange}
        />
      )}
    </div>
  );
}
