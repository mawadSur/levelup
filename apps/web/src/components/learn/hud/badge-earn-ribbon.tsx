'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award } from 'lucide-react';
import { cn } from '@levelup/ui';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

// ---------------------------------------------------------------------------
// Event shape — must match the dispatch call-site
// ---------------------------------------------------------------------------

export interface BadgeEarnedEventDetail {
  slug: string;
  label: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  iconKey: string;
  xpReward: number;
}

declare global {
  interface WindowEventMap {
    'levelup:badge-earned': CustomEvent<BadgeEarnedEventDetail>;
  }
}

// ---------------------------------------------------------------------------
// Single ribbon card
// ---------------------------------------------------------------------------

interface RibbonItemProps {
  detail: BadgeEarnedEventDetail;
  index: number;
  onDismiss: (slug: string) => void;
}

const RARITY_COLORS: Record<BadgeEarnedEventDetail['rarity'], string> = {
  common: 'text-paper-300',
  rare: 'text-paper-100',
  epic: 'text-signal-dim',
  legendary: 'text-signal',
};

function RibbonItem({ detail, index, onDismiss }: RibbonItemProps) {
  const prefersReduced = useReducedMotion();

  const slideVariants = prefersReduced
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.18 } },
        exit: { opacity: 0, transition: { duration: 0.18 } },
      }
    : {
        hidden: { opacity: 0, x: 80 },
        visible: {
          opacity: 1,
          x: 0,
          transition: {
            duration: 0.2,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          },
        },
        exit: {
          opacity: 0,
          x: 80,
          transition: { duration: 0.2, ease: 'easeIn' as const },
        },
      };

  return (
    <motion.div
      key={detail.slug}
      layout
      variants={slideVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ top: `${index * 80 + 16}px` }}
      className={cn(
        'fixed right-4 z-[60] w-72',
        'rounded-xl border border-signal/30 bg-signal px-4 py-3 shadow-xl',
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon with 3D coin-flip */}
        <motion.div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900/15"
          animate={prefersReduced ? {} : { rotateY: [0, 360] }}
          transition={prefersReduced ? {} : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <Award className={cn('h-5 w-5', RARITY_COLORS[detail.rarity])} aria-hidden="true" />
        </motion.div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[13px] italic font-semibold leading-none text-ink-900">
            Badge earned
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink-900/90">{detail.label}</p>
          {/* XP reward chip */}
          <span className="mt-1.5 inline-flex items-center rounded-full bg-ink-900/15 px-1.5 py-0.5 text-[11px] font-semibold text-ink-900">
            +{detail.xpReward}&nbsp;XP
          </span>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(detail.slug)}
          className="ml-1 shrink-0 rounded-sm p-0.5 opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/40"
          aria-label={`Dismiss ${detail.label} badge notification`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M2 2l8 8M10 2l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Badge listener — mount once inside learner-shell
// ---------------------------------------------------------------------------

/**
 * Listens globally for `levelup:badge-earned` custom DOM events and renders
 * a stacked ribbon queue in the top-right corner.
 *
 * Mount this once inside LearnerShell (outside the main content so it
 * persists across route changes).
 */
export function BadgeEarnRibbon() {
  const [queue, setQueue] = useState<BadgeEarnedEventDetail[]>([]);
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    function handleEvent(e: CustomEvent<BadgeEarnedEventDetail>) {
      const detail = e.detail;
      setQueue((prev) => {
        // Avoid duplicates
        if (prev.some((r) => r.slug === detail.slug)) return prev;
        return [...prev, detail];
      });

      // Auto-dismiss after 4 s
      const tid = setTimeout(() => {
        setQueue((prev) => prev.filter((r) => r.slug !== detail.slug));
        timerMap.current.delete(detail.slug);
      }, 4_000);
      timerMap.current.set(detail.slug, tid);
    }

    window.addEventListener('levelup:badge-earned', handleEvent);
    return () => window.removeEventListener('levelup:badge-earned', handleEvent);
  }, []);

  // Cleanup all timers on unmount
  useEffect(() => {
    const map = timerMap.current;
    return () => {
      map.forEach((id) => clearTimeout(id));
    };
  }, []);

  function dismiss(slug: string) {
    const existing = timerMap.current.get(slug);
    if (existing !== undefined) {
      clearTimeout(existing);
      timerMap.current.delete(slug);
    }
    setQueue((prev) => prev.filter((r) => r.slug !== slug));
  }

  return (
    <AnimatePresence mode="popLayout">
      {queue.map((item, idx) => (
        <RibbonItem key={item.slug} detail={item} index={idx} onDismiss={dismiss} />
      ))}
    </AnimatePresence>
  );
}
