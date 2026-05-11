'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogTitle, Button } from '@levelup/ui';
import { Sparkles } from 'lucide-react';
import { cn } from '@levelup/ui';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { easeBounce } from '@/lib/motion/variants';
import { useXpState } from './xp-context';
import { fireConfetti } from './confetti';

// ---------------------------------------------------------------------------
// Sparkle-burst particles
// ---------------------------------------------------------------------------

interface SparkleDotsProps {
  count?: number;
}

function SparkleDots({ count = 12 }: SparkleDotsProps) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * 360;
        const distance = 80 + (i % 3) * 24;
        const rad = (angle * Math.PI) / 180;
        const tx = Math.cos(rad) * distance;
        const ty = Math.sin(rad) * distance;
        const size = 4 + (i % 3) * 2;

        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full bg-signal"
            style={{ width: size, height: size, x: '-50%', y: '-50%' }}
            initial={{ opacity: 0, x: '-50%', y: '-50%', scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: `calc(-50% + ${tx}px)`,
              y: `calc(-50% + ${ty}px)`,
              scale: [0, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              ease: easeBounce.type ? 'easeOut' : [0.34, 1.56, 0.64, 1],
              delay: i * 0.03,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level-up modal
// ---------------------------------------------------------------------------

/**
 * Full-screen ceremony modal shown when the player's level increments.
 * Triggered automatically by XpProvider state changes.
 */
export function LevelUpModal() {
  const { pendingLevelUp, newLevel, consumePendingLevelUp } = useXpState();
  const prefersReduced = useReducedMotion();
  const confettiFiredRef = useRef(false);

  // Fire confetti once when the modal opens
  useEffect(() => {
    if (pendingLevelUp && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      void fireConfetti({ particles: 80, intense: false });
    }
    if (!pendingLevelUp) {
      confettiFiredRef.current = false;
    }
  }, [pendingLevelUp]);

  return (
    <Dialog
      open={pendingLevelUp}
      onOpenChange={(open) => {
        if (!open) consumePendingLevelUp();
      }}
    >
      <DialogContent
        className={cn(
          'flex flex-col items-center text-center',
          'max-w-sm gap-0 p-8',
          'bg-ink-900/95 backdrop-blur-sm border-signal/20',
        )}
      >
        <DialogTitle className="sr-only">Level Up!</DialogTitle>

        {/* Sparkle burst (relative container for absolute particles) */}
        <div className="relative mb-6 flex items-center justify-center">
          <SparkleDots count={12} />

          {/* Main icon */}
          <motion.div
            initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={prefersReduced ? { duration: 0 } : easeBounce}
            className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-signal/10"
          >
            <Sparkles className="h-10 w-10 text-signal" aria-hidden="true" />
          </motion.div>
        </div>

        {/* Headline */}
        <motion.h2
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReduced ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
          }
          className="font-serif text-[56px] leading-none tracking-tight text-paper-100"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          Level Up!
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }
          }
          className="mt-3 text-base font-semibold text-signal"
        >
          You reached Level {newLevel}
        </motion.p>

        <motion.p
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.4, delay: 0.2 }}
          className="mt-2 text-sm text-paper-300"
        >
          Keep building momentum — your next level awaits.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.25 }
          }
          className="mt-8 w-full"
        >
          <Button className="w-full" onClick={consumePendingLevelUp}>
            Keep going
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
