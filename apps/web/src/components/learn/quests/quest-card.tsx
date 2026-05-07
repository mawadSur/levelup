'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, Button, Progress, toast } from '@levelup/ui';
import {
  BookOpen,
  MessageSquareText,
  BookmarkPlus,
  Target,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { cn } from '@/lib/utils';
import type { DailyQuestItem, DailyQuestKind } from '@levelup/types';

// ---------------------------------------------------------------------------
// Icon + colour mappings per quest kind
// ---------------------------------------------------------------------------

const KIND_META: Record<
  DailyQuestKind,
  { Icon: React.ElementType; bg: string; fg: string; label: string }
> = {
  lesson: { Icon: BookOpen, bg: 'bg-blue-100', fg: 'text-blue-600', label: 'Lesson' },
  coach: { Icon: MessageSquareText, bg: 'bg-violet-100', fg: 'text-violet-600', label: 'Coach' },
  prompt: { Icon: BookmarkPlus, bg: 'bg-emerald-100', fg: 'text-emerald-600', label: 'Prompt' },
  quiz: { Icon: Target, bg: 'bg-amber-100', fg: 'text-amber-600', label: 'Quiz' },
  streak: { Icon: Flame, bg: 'bg-orange-100', fg: 'text-orange-600', label: 'Streak' },
};

function kindLabel(kind: DailyQuestKind, target: number): string {
  const map: Record<DailyQuestKind, string> = {
    lesson: `${target} lesson${target !== 1 ? 's' : ''}`,
    coach: `${target} AI conversation${target !== 1 ? 's' : ''}`,
    prompt: `${target} prompt${target !== 1 ? 's' : ''}`,
    quiz: `${target} quiz${target !== 1 ? 'zes' : ''}`,
    streak: `Keep your streak going`,
  };
  return map[kind];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface QuestCardProps {
  quest: DailyQuestItem;
  onClaim: (slug: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuestCard({ quest, onClaim }: QuestCardProps) {
  const [claiming, setClaiming] = useState(false);
  const [floatXp, setFloatXp] = useState(false);
  const [cardBounce, setCardBounce] = useState(false);
  const prefersReduced = useReducedMotion();

  const { slug, title, kind, target, progress, claimed, xpReward } = quest;
  const { Icon, bg, fg } = KIND_META[kind];
  const progressPct = target > 0 ? Math.min(1, progress / target) : 0;
  const isReady = progress >= target && !claimed;

  async function handleClaim() {
    if (claiming || claimed) return;
    setClaiming(true);
    try {
      await onClaim(slug);
      // Micro-celebration
      if (!prefersReduced) {
        setCardBounce(true);
        setFloatXp(true);
        setTimeout(() => setCardBounce(false), 300);
        setTimeout(() => setFloatXp(false), 750);
      }
      toast({ title: `+${xpReward} XP`, description: title });
    } catch {
      toast({
        title: 'Could not claim quest',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClaiming(false);
    }
  }

  // Card scale-bounce animation
  const cardVariants = {
    idle: { scale: 1 },
    bounce: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 0.22,
        ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <motion.div
      variants={prefersReduced ? undefined : cardVariants}
      animate={cardBounce && !prefersReduced ? 'bounce' : 'idle'}
      className="relative"
    >
      <Card className="overflow-visible">
        <CardContent className="flex items-start gap-3 p-3 sm:items-center">
          {/* Kind icon */}
          <div
            className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', bg)}
            aria-hidden="true"
          >
            <Icon className={cn('h-4 w-4', fg)} />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-snug text-foreground">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {progress > 0 && !claimed
                ? `${progress} of ${kindLabel(kind, target)}`
                : claimed
                  ? kindLabel(kind, target)
                  : kindLabel(kind, target)}
            </p>
          </div>

          {/* Right: status */}
          <div className="relative flex shrink-0 items-center gap-2 pl-2">
            {claimed ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                Claimed
              </span>
            ) : isReady ? (
              <div className="relative">
                <Button
                  size="sm"
                  disabled={claiming}
                  onClick={handleClaim}
                  aria-label={`Claim ${xpReward} XP for "${title}"`}
                >
                  {claiming ? 'Claiming…' : `Claim +${xpReward} XP`}
                </Button>

                {/* +XP float-up animation */}
                <AnimatePresence>
                  {floatXp && !prefersReduced && (
                    <motion.span
                      key="xp-float"
                      className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 select-none text-sm font-bold text-primary"
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: -28 }}
                      exit={{}}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      aria-hidden="true"
                    >
                      +{xpReward} XP
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* In-progress thin bar */
              <div className="w-24">
                <Progress
                  value={progressPct * 100}
                  className="h-1.5"
                  aria-label={`${Math.round(progressPct * 100)}% complete`}
                />
                <p className="mt-0.5 text-right text-[10px] text-muted-foreground">
                  {progress}/{target}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
