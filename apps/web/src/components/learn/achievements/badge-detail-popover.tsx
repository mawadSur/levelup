'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import type { BadgeDef, Rarity } from './badge-catalog';
import { RARITY_LABELS } from './badge-catalog';

// ---------------------------------------------------------------------------
// Rarity chip color map
// ---------------------------------------------------------------------------
const RARITY_CHIP_CLASS: Record<Rarity, string> = {
  COMMON: 'bg-muted text-muted-foreground',
  RARE: 'bg-primary/10 text-primary',
  EPIC: 'bg-[hsl(var(--accent-warm))]/20 text-[hsl(var(--accent-warm))]',
  LEGENDARY: 'bg-gradient-to-r from-primary/20 to-[hsl(var(--accent-warm))]/20 text-primary',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface BadgeDetailPopoverProps {
  badge: BadgeDef;
  earned: boolean;
  awardedAt?: Date;
  /** Trigger element — the popover wraps this and positions above it. */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function BadgeDetailPopover({
  badge,
  earned,
  awardedAt,
  children,
}: BadgeDetailPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const prefersReduced = useReducedMotion();

  const popoverVariants = {
    hidden: { opacity: 0, scale: 0.94, y: 6 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
      opacity: 0,
      scale: 0.94,
      y: 4,
      transition: { duration: 0.12, ease: 'easeIn' },
    },
  };

  const formattedDate =
    awardedAt instanceof Date
      ? awardedAt.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}

      <AnimatePresence>
        {open && (
          <motion.div
            role="tooltip"
            aria-live="polite"
            variants={prefersReduced ? undefined : popoverVariants}
            initial={prefersReduced ? undefined : 'hidden'}
            animate={prefersReduced ? undefined : 'visible'}
            exit={prefersReduced ? undefined : 'exit'}
            className={[
              'absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-56 -translate-x-1/2',
              'rounded-xl border border-border bg-background p-3.5 shadow-lg',
              'pointer-events-none',
            ].join(' ')}
          >
            {/* Arrow */}
            <span
              aria-hidden
              className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 block h-[9px] w-[9px] rotate-45 border-b border-r border-border bg-background"
            />

            {/* Label */}
            <p className="font-display text-base font-semibold leading-tight text-foreground">
              {badge.label}
            </p>

            {/* Rarity chip */}
            <span
              className={[
                'mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                RARITY_CHIP_CLASS[badge.rarity],
              ].join(' ')}
            >
              {RARITY_LABELS[badge.rarity]}
            </span>

            {/* Description */}
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {badge.description}
            </p>

            {/* Earned / locked section */}
            {earned ? (
              formattedDate && (
                <p className="mt-2 text-xs text-primary font-medium">Earned {formattedDate}</p>
              )
            ) : (
              <p className="mt-2 flex items-start gap-1 text-xs italic text-primary leading-relaxed font-sans">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                How to unlock: {badge.unlockHint}
              </p>
            )}

            {/* XP reward */}
            <div className="mt-2.5 flex items-center gap-1">
              <span className="rounded-full bg-[hsl(var(--accent-warm))]/15 px-2 py-0.5 text-xs font-semibold text-[hsl(var(--accent-warm))]">
                +{badge.xpReward} XP
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
