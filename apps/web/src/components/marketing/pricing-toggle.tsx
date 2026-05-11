'use client';

import * as React from 'react';
import { cn } from '@levelup/ui';

export type BillingIntervalChoice = 'MONTHLY' | 'ANNUAL';

interface PricingToggleProps {
  value: BillingIntervalChoice;
  onChange: (next: BillingIntervalChoice) => void;
  /** Optional savings copy shown next to ANNUAL. Defaults to "SAVE 17%". */
  annualSavingsLabel?: string;
  className?: string;
}

export function PricingToggle({
  value,
  onChange,
  annualSavingsLabel = 'SAVE 17%',
  className,
}: PricingToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className={cn(
        'inline-flex items-center gap-1 border border-ink-600 bg-ink-800 p-1 rounded-sm',
        className,
      )}
    >
      <ToggleOption
        active={value === 'MONTHLY'}
        onClick={() => onChange('MONTHLY')}
        ariaLabel="Monthly billing"
      >
        MONTHLY
      </ToggleOption>
      <ToggleOption
        active={value === 'ANNUAL'}
        onClick={() => onChange('ANNUAL')}
        ariaLabel="Annual billing"
      >
        <span>ANNUAL</span>
        <span
          aria-hidden
          className={cn(
            'ml-2 inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.05em] rounded-data',
            value === 'ANNUAL' ? 'bg-ink-900 text-signal' : 'bg-ink-700 text-paper-300',
          )}
        >
          {annualSavingsLabel}
        </span>
      </ToggleOption>
    </div>
  );
}

interface ToggleOptionProps {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}

function ToggleOption({ active, onClick, ariaLabel, children }: ToggleOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-4 py-2 font-mono text-mono-sm uppercase tracking-[0.05em] rounded-sm',
        'transition-colors duration-150 ease-mission',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-signal',
        active ? 'bg-signal text-ink-900' : 'bg-transparent text-paper-300 hover:text-paper-100',
      )}
    >
      {children}
    </button>
  );
}
