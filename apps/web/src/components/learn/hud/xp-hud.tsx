'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@levelup/ui';
import { cn } from '@levelup/ui';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { useXpState } from './xp-context';
import { StreakFlame } from './streak-flame';

// ---------------------------------------------------------------------------
// Level badge — pulses briefly when the level increments
// ---------------------------------------------------------------------------

interface LevelBadgeProps {
  level: number;
}

function LevelBadge({ level }: LevelBadgeProps) {
  const prefersReduced = useReducedMotion();
  const prevLevelRef = useRef(level);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (prefersReduced) {
      prevLevelRef.current = level;
      return;
    }
    if (prevLevelRef.current !== level && prevLevelRef.current !== 0) {
      setPulsing(true);
      const id = setTimeout(() => setPulsing(false), 320);
      prevLevelRef.current = level;
      return () => clearTimeout(id);
    }
    prevLevelRef.current = level;
  }, [level, prefersReduced]);

  return (
    <motion.span
      animate={pulsing && !prefersReduced ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        'inline-flex items-center rounded-full bg-primary px-2 py-0.5',
        'font-display text-[13px] italic font-semibold text-primary-foreground leading-none',
        'shrink-0 select-none',
      )}
    >
      Lv&nbsp;{level}
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// XP progress bar segment
// ---------------------------------------------------------------------------

interface XpBarProps {
  xpAtCurrentLevel: number;
  xpForNextLevel: number;
}

function XpBar({ xpAtCurrentLevel, xpForNextLevel }: XpBarProps) {
  const prefersReduced = useReducedMotion();
  const pct = xpForNextLevel > 0 ? (xpAtCurrentLevel / xpForNextLevel) * 100 : 0;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`XP progress: ${xpAtCurrentLevel} of ${xpForNextLevel}`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: `${pct}%` }}
              transition={
                prefersReduced ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
              }
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {xpAtCurrentLevel} / {xpForNextLevel} XP
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// XP HUD — main export
// ---------------------------------------------------------------------------

/**
 * Compact game HUD for the learner top bar.
 *
 * Desktop (sm+): level badge + XP bar (~280 px) + streak flame.
 * Mobile (<sm): streak flame only.
 *
 * Returns null when game state is unavailable.
 */
export function XpHud() {
  const { state } = useXpState();

  if (!state) return null;

  const { level, xpAtCurrentLevel, xpForNextLevel, currentStreak } = state;

  return (
    <>
      {/* Desktop row */}
      <div
        className="hidden sm:flex items-center gap-2"
        style={{ width: '280px' }}
        aria-label="XP progress"
      >
        <LevelBadge level={level} />
        <div className="flex-1 min-w-0">
          <XpBar xpAtCurrentLevel={xpAtCurrentLevel} xpForNextLevel={xpForNextLevel} />
        </div>
        <StreakFlame count={currentStreak} />
      </div>

      {/* Mobile: streak only */}
      <div className="flex sm:hidden items-center" aria-label="Current streak">
        <StreakFlame count={currentStreak} />
      </div>
    </>
  );
}
