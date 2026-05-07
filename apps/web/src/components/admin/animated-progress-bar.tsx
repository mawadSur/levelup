'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { cn } from '@/lib/utils';

interface AnimatedProgressBarProps {
  /** Progress value between 0 and 1. */
  value: number;
  /** Accessible label for screen readers. */
  label?: string;
  /** Whether to show the trailing glow at the leading edge (default: true). */
  showGlow?: boolean;
  className?: string;
}

/**
 * A thin progress bar that animates from 0 to `value` on mount.
 *
 * Features:
 * - Oxblood fill (`bg-primary`) animated with `easeStandard`.
 * - Optional 1-px trailing glow that fades out after the fill lands.
 * - Fully reduced-motion safe — fills instantly, no glow.
 */
export function AnimatedProgressBar({
  value,
  label,
  showGlow = true,
  className,
}: AnimatedProgressBarProps) {
  const prefersReduced = useReducedMotion();
  const [glowVisible, setGlowVisible] = useState(true);

  const clampedValue = Math.min(1, Math.max(0, value));
  const pct = clampedValue * 100;

  if (prefersReduced) {
    return (
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      {/* Animated fill */}
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={{ width: '0%' }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => {
          // Fade out the glow 200 ms after the fill settles
          setTimeout(() => setGlowVisible(false), 200);
        }}
      />

      {/* Trailing glow — 1 px high, positioned at the leading edge of the fill */}
      {showGlow && (
        <motion.div
          className="pointer-events-none absolute inset-y-0 w-4 -translate-x-full rounded-full"
          style={{
            left: `${pct}%`,
            background: 'linear-gradient(to left, hsl(var(--primary) / 0.7), transparent)',
            height: '1px',
            top: '50%',
            transform: 'translateY(-50%) translateX(-100%)',
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: glowVisible ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}
