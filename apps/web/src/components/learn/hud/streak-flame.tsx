'use client';

import { Flame } from 'lucide-react';
import { cn } from '@levelup/ui';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

interface StreakFlameProps {
  count: number;
  className?: string;
}

/**
 * Small streak icon + counter.
 *
 * - Oxblood flame when count >= 1, muted at 60% when count = 0.
 * - Warm-amber glow animation when count >= 7 (disabled under reduced-motion).
 * - Count rendered next to the icon in font-display italic 14 px.
 */
export function StreakFlame({ count, className }: StreakFlameProps) {
  const prefersReduced = useReducedMotion();
  const active = count >= 1;
  const glowing = active && count >= 7 && !prefersReduced;

  return (
    <>
      {/* Keyframe injected once — ignored by browsers that don't need it */}
      {glowing && (
        <style>{`
          @keyframes streak-glow {
            0%, 100% { filter: drop-shadow(0 0 4px hsl(var(--accent-warm, 40 80% 55%) / 0.3)); }
            50%       { filter: drop-shadow(0 0 8px hsl(var(--accent-warm, 40 80% 55%) / 0.5)); }
          }
          .streak-glow-anim {
            animation: streak-glow 2s ease-in-out infinite;
          }
        `}</style>
      )}
      <span
        className={cn('flex items-center gap-0.5', className)}
        aria-label={`${count}-day streak`}
      >
        <Flame
          className={cn(
            'h-4 w-4 shrink-0',
            active ? 'text-primary' : 'text-muted-foreground opacity-60',
            glowing && 'streak-glow-anim',
          )}
          aria-hidden="true"
        />
        <span className="font-display text-[14px] italic leading-none" aria-hidden="true">
          {count}
        </span>
      </span>
    </>
  );
}
