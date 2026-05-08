'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@levelup/ui';
import { cn } from '@levelup/ui';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { CountUp } from '@/lib/motion/count-up';
import { AnimatedProgressBar } from '@/components/admin/animated-progress-bar';
import { fireConfetti } from './confetti';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface XpBreakdownItem {
  label: string;
  xp: number;
}

export interface LessonCompletionModalProps {
  open: boolean;
  onClose(): void;
  xpBreakdown: XpBreakdownItem[];
  totalXp: number;
  /** Progress within the current learning path, 0–1. */
  pathProgressPct: number;
  nextLessonHref?: string;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const slideUpVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
  },
  exit: {
    opacity: 0,
    y: 40,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

// ---------------------------------------------------------------------------
// XP breakdown row
// ---------------------------------------------------------------------------

interface BreakdownRowProps {
  label: string;
  xp: number;
}

function BreakdownRow({ label, xp }: BreakdownRowProps) {
  return (
    <motion.div
      variants={rowVariants}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between text-sm"
    >
      <span className="text-paper-300">{label}</span>
      <span className="font-semibold text-signal">+{xp}</span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Auto-dismiss progress ring (simple implementation)
// ---------------------------------------------------------------------------

interface DismissRingProps {
  durationMs: number;
  onDismiss(): void;
}

function DismissRing({ durationMs, onDismiss }: DismissRingProps) {
  const prefersReduced = useReducedMotion();
  const size = 24;
  const r = 10;
  const circumference = 2 * Math.PI * r;

  return (
    <motion.div
      className="absolute right-4 top-4 cursor-pointer opacity-40 hover:opacity-70"
      title="Auto-dismiss"
      onClick={onDismiss}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity={0.3}
        />
        {!prefersReduced && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ rotate: -90, originX: '50%', originY: '50%' }}
            animate={{ strokeDashoffset: circumference }}
            transition={{ duration: durationMs / 1000, ease: 'linear' }}
            onAnimationComplete={onDismiss}
          />
        )}
      </svg>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 4_000;

/**
 * Slides up from the bottom after a lesson pass.
 * Auto-dismisses after 4 s if the user hasn't interacted.
 * Fires a restrained confetti burst on open.
 */
export function LessonCompletionModal({
  open,
  onClose,
  xpBreakdown,
  totalXp,
  pathProgressPct,
  nextLessonHref,
}: LessonCompletionModalProps) {
  const prefersReduced = useReducedMotion();
  const confettiFiredRef = useRef(false);
  const [interacted, setInteracted] = useState(false);

  // Fire confetti on open (once)
  useEffect(() => {
    if (open && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      void fireConfetti({ particles: 50, intense: false });
    }
    if (!open) {
      confettiFiredRef.current = false;
      setInteracted(false);
    }
  }, [open]);

  // Auto-dismiss timer — cancelled when user interacts
  useEffect(() => {
    if (!open || interacted) return;
    const id = setTimeout(() => {
      onClose();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [open, interacted, onClose]);

  function handleInteract() {
    setInteracted(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={() => {
              handleInteract();
              onClose();
            }}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            key="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-completion-title"
            className={cn(
              'fixed bottom-0 left-1/2 z-50 w-full max-w-md',
              '-translate-x-1/2',
              'rounded-t-2xl bg-ink-900 border border-ink-600/60 shadow-2xl',
              'p-6 pb-8',
            )}
            variants={prefersReduced ? undefined : slideUpVariants}
            initial={prefersReduced ? undefined : 'hidden'}
            animate={prefersReduced ? undefined : 'visible'}
            exit={prefersReduced ? undefined : 'exit'}
            onClick={handleInteract}
          >
            {/* Auto-dismiss ring */}
            {!interacted && <DismissRing durationMs={AUTO_DISMISS_MS} onDismiss={onClose} />}

            {/* Header */}
            <h2
              id="lesson-completion-title"
              className="font-serif text-[36px] italic leading-none tracking-tight text-paper-100"
            >
              Lesson complete!
            </h2>

            <p className="mt-1 text-sm text-paper-300">Here&apos;s what you earned this session.</p>

            {/* XP breakdown rows — staggered entrance */}
            <motion.div
              className="mt-5 space-y-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: prefersReduced ? 0 : 0.15,
                  },
                },
              }}
            >
              {xpBreakdown.map((item) => (
                <BreakdownRow key={item.label} label={item.label} xp={item.xp} />
              ))}
            </motion.div>

            {/* Divider */}
            <div className="my-4 h-px bg-border" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-paper-300">Total XP earned</span>
              <span className="font-serif text-3xl italic font-semibold text-signal leading-none">
                +<CountUp value={totalXp} duration={0.6} />
              </span>
            </div>

            {/* Path progress bar */}
            <div className="mt-4 space-y-1.5">
              <p className="text-xs text-paper-300">
                Path progress — {Math.round(pathProgressPct * 100)}%
              </p>
              <AnimatedProgressBar
                value={pathProgressPct}
                label="Path progress"
                className="h-1.5"
              />
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {nextLessonHref && (
                <Button asChild className="flex-1" onClick={handleInteract}>
                  <Link href={nextLessonHref}>Next lesson &rarr;</Link>
                </Button>
              )}
              <Button
                variant="outline"
                className={cn('flex-1', !nextLessonHref && 'w-full')}
                asChild
                onClick={handleInteract}
              >
                <Link href="/learn">Back to path</Link>
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
