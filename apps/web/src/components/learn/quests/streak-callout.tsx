'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Flame } from 'lucide-react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StreakCalloutProps {
  streak: number;
  earnedToday: number;
  nextLessonHref: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `levelup:streak-callout-dismissed-${yyyy}-${mm}-${dd}`;
}

function isLateOrEarly(): boolean {
  const h = new Date().getHours();
  return h >= 22 || h <= 4;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StreakCallout({ streak, earnedToday, nextLessonHref }: StreakCalloutProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden, check on client
  const [mounted, setMounted] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    const key = todayKey();
    const wasDismissed = typeof window !== 'undefined' && !!localStorage.getItem(key);
    setDismissed(wasDismissed);
  }, []);

  // Conditions to show
  const shouldShow = mounted && !dismissed && streak >= 1 && earnedToday === 0 && isLateOrEarly();

  if (!shouldShow) return null;

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(todayKey(), '1');
    }
    setDismissed(true);
  }

  const copy =
    streak >= 7
      ? `You're on a ${streak}-day streak — that's serious. Don't break it tonight.`
      : `You're on a ${streak}-day streak. Don't break it tonight.`;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-signal/30 bg-signal/10 px-4 py-3',
        'text-paper-100',
      )}
    >
      {/* Flame icon with optional pulse animation */}
      <div className="relative flex shrink-0 items-center justify-center pt-0.5">
        {!prefersReduced ? (
          <motion.div
            animate={{
              filter: [
                'drop-shadow(0 0 0px hsl(38 92% 50% / 0))',
                'drop-shadow(0 0 6px hsl(38 92% 50% / 0.8))',
                'drop-shadow(0 0 0px hsl(38 92% 50% / 0))',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <Flame className="h-5 w-5 text-warning" />
          </motion.div>
        ) : (
          <Flame className="h-5 w-5 text-warning" aria-hidden="true" />
        )}
      </div>

      {/* Copy + CTA */}
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        <p className="font-serif text-sm italic leading-snug">{copy}</p>
        <Link
          href={nextLessonHref}
          className="shrink-0 text-sm font-semibold text-signal underline-offset-2 hover:underline"
        >
          Quick lesson &rarr;
        </Link>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={handleDismiss}
        className="ml-auto shrink-0 self-start text-paper-300 hover:text-paper-100"
        aria-label="Dismiss streak reminder"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
