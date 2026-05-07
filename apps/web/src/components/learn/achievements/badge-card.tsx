'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Trophy,
  Sparkles,
  Crown,
  Flame,
  Star,
  Lock,
  BookOpen,
  MessageSquareText,
  BookmarkPlus,
  ShieldCheck,
} from 'lucide-react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { BadgeDetailPopover } from './badge-detail-popover';
import type { BadgeDef, Rarity } from './badge-catalog';

// ---------------------------------------------------------------------------
// Icon registry — maps iconKey string → Lucide component
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  Trophy,
  Sparkles,
  Crown,
  Flame,
  Star,
  Lock,
  BookOpen,
  MessageSquareText,
  BookmarkPlus,
  ShieldCheck,
};

function BadgeIcon({
  iconKey,
  earned,
  rarity,
}: {
  iconKey: string;
  earned: boolean;
  rarity: Rarity;
}) {
  const Icon = ICON_MAP[iconKey] ?? Award;
  const colorClass = earned ? RARITY_ICON_COLOR[rarity] : 'text-muted-foreground';
  return (
    <Icon
      className={[
        'h-9 w-9 shrink-0 transition-all',
        colorClass,
        !earned ? 'opacity-30 grayscale' : '',
      ].join(' ')}
      aria-hidden
    />
  );
}

// ---------------------------------------------------------------------------
// Rarity border/color helpers
// ---------------------------------------------------------------------------
const RARITY_BORDER_CLASS: Record<Rarity, string> = {
  COMMON: 'border-muted-foreground/40',
  RARE: 'border-primary',
  EPIC: 'border-[hsl(var(--accent-warm))]',
  LEGENDARY: 'border-transparent',
};

const RARITY_ICON_COLOR: Record<Rarity, string> = {
  COMMON: 'text-muted-foreground',
  RARE: 'text-primary',
  EPIC: 'text-[hsl(var(--accent-warm))]',
  LEGENDARY: 'text-primary',
};

// LEGENDARY gets a gradient border via a wrapper technique:
// we add a gradient background on the outer ring and mask the inner area.
function LegendaryRing({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="absolute inset-0 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-warm)))',
        padding: '1px',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// BadgeCard
// ---------------------------------------------------------------------------
export interface BadgeCardProps {
  badge: BadgeDef;
  earned: boolean;
  awardedAt?: Date;
}

export function BadgeCard({ badge, earned, awardedAt }: BadgeCardProps) {
  const prefersReduced = useReducedMotion();

  const tileContent = (
    <div
      className={[
        'relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3',
        'aspect-square cursor-default select-none overflow-hidden',
        'bg-background transition-colors',
        earned ? RARITY_BORDER_CLASS[badge.rarity] : 'border-border',
        !earned ? 'opacity-50' : '',
      ].join(' ')}
      aria-label={`${badge.label}${earned ? ' (earned)' : ' (locked)'}`}
    >
      {/* LEGENDARY gradient ring */}
      {badge.rarity === 'LEGENDARY' && earned && <LegendaryRing>{null}</LegendaryRing>}

      {/* Icon */}
      <BadgeIcon iconKey={badge.iconKey} earned={earned} rarity={badge.rarity} />

      {/* Label */}
      <span
        className={[
          'text-center font-display text-[11px] font-semibold leading-tight',
          earned ? 'text-foreground' : 'text-muted-foreground',
        ].join(' ')}
      >
        {badge.label}
      </span>

      {/* Lock overlay icon for locked badges */}
      {!earned && (
        <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground/60" aria-hidden />
      )}
    </div>
  );

  const scaledTile = prefersReduced ? (
    tileContent
  ) : (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="h-full w-full"
    >
      {tileContent}
    </motion.div>
  );

  return (
    <BadgeDetailPopover badge={badge} earned={earned} awardedAt={awardedAt}>
      {scaledTile}
    </BadgeDetailPopover>
  );
}
