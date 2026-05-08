'use client';

import * as React from 'react';
import { MonoLabel, cn } from '@levelup/ui';

export interface PlanCardProps {
  /** Tier name shown in the top-left mono label, e.g. "TEAM". */
  tier: string;
  /** Right-aligned tier badge in the header — defaults to "PLAN". */
  badge?: string;
  /** One-line description under the price. */
  description: string;
  /**
   * Render slot for the headline price. Typically a `<MissionNumber />` wrapped
   * with a /SEAT/MO mono caption, or a flat dollar string like "$599".
   */
  price: React.ReactNode;
  /** Optional secondary line under the price (e.g. monthly equivalent on annual). */
  priceCaption?: React.ReactNode;
  /** Optional slider/seat-count widget rendered between price and total. */
  seatControl?: React.ReactNode;
  /** Optional total line rendered above the feature list. */
  total?: React.ReactNode;
  /** List of feature strings rendered with a `+` mono prefix. */
  features: ReadonlyArray<string>;
  /** Bottom CTA — e.g. a `<Button asChild><Link…/></Button>`. */
  cta: React.ReactNode;
  /** When true the card is visually emphasised (signal border, RECOMMENDED ribbon). */
  highlight?: boolean;
  /** When true the card uses a more compressed layout — used for ENTERPRISE. */
  compact?: boolean;
  className?: string;
}

export function PlanCard({
  tier,
  badge = 'PLAN',
  description,
  price,
  priceCaption,
  seatControl,
  total,
  features,
  cta,
  highlight = false,
  compact = false,
  className,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col bg-ink-800 border transition-colors duration-200 ease-mission rounded-sm',
        compact ? 'p-6' : 'p-8',
        highlight ? 'border-signal lg:-mt-4 lg:mb-4' : 'border-ink-600 hover:border-signal-dim',
        className,
      )}
    >
      {highlight && (
        <div className="absolute -top-px left-0 right-0 flex justify-center">
          <span className="-translate-y-1/2 bg-signal px-3 py-1 font-mono text-mono-sm uppercase tracking-[0.05em] text-ink-900 rounded-data">
            RECOMMENDED
          </span>
        </div>
      )}

      <div
        className={cn(
          'mb-6 flex items-baseline justify-between border-b border-ink-600 pb-5',
          compact && 'mb-4 pb-4',
        )}
      >
        <MonoLabel tone="signal">{tier.toUpperCase()}</MonoLabel>
        <MonoLabel className="text-paper-500">{badge}</MonoLabel>
      </div>

      <div className={cn('mb-6', compact && 'mb-4')}>
        <div className="font-serif text-display-md tabular-nums text-paper-100 leading-none">
          {price}
        </div>
        {priceCaption ? (
          <div className="mt-2 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            {priceCaption}
          </div>
        ) : null}
        <p className="mt-3 text-body-sm text-paper-300 max-w-reading">{description}</p>
      </div>

      {seatControl ? (
        <div className="mb-6 border-t border-ink-600 pt-5">{seatControl}</div>
      ) : null}

      {total ? (
        <div
          className={cn(
            'mb-6 border-y border-ink-600 py-4 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300',
            !seatControl && 'border-t-0 pt-0',
          )}
        >
          {total}
        </div>
      ) : null}

      <ul
        className={cn(
          'mb-8 flex-1 space-y-3',
          !seatControl && !total ? 'border-t border-ink-600 pt-6' : '',
        )}
      >
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-body-sm text-paper-100">
            <span
              aria-hidden
              className="mt-[2px] font-mono text-mono-sm uppercase tracking-[0.05em] text-signal"
            >
              +
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div>{cta}</div>
    </div>
  );
}
