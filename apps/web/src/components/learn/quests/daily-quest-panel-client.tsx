'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@levelup/ui';
import { game } from '@/lib/api';
import type { DailyQuestItem } from '@levelup/types';
import { AnimatedProgressBar } from '@/components/admin/animated-progress-bar';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';
import { QuestCard } from './quest-card';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DailyQuestPanelClientProps {
  initialQuests: DailyQuestItem[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailyQuestPanelClient({ initialQuests }: DailyQuestPanelClientProps) {
  const [quests, setQuests] = useState<DailyQuestItem[]>(initialQuests);

  const completedCount = quests.filter((q) => q.claimed).length;
  const totalCount = quests.length;

  // Empty / skeleton state
  if (quests.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Your quests will be ready in a moment.
        </CardContent>
      </Card>
    );
  }

  async function handleClaim(slug: string) {
    // Optimistic update — mark as claimed immediately
    setQuests((prev) => prev.map((q) => (q.slug === slug ? { ...q, claimed: true } : q)));

    try {
      await game.claimQuest(slug);
    } catch (err) {
      // Revert optimistic update on failure
      setQuests((prev) => prev.map((q) => (q.slug === slug ? { ...q, claimed: false } : q)));
      throw err; // Let QuestCard handle the toast
    }
  }

  return (
    <section aria-labelledby="daily-quests-heading">
      {/* Total progress chip */}
      <div className="mb-3 flex items-center gap-3">
        <span
          id="daily-quests-progress-label"
          className="shrink-0 text-xs font-semibold text-muted-foreground"
        >
          {completedCount}/{totalCount} today
        </span>
        <AnimatedProgressBar
          value={totalCount > 0 ? completedCount / totalCount : 0}
          label={`${completedCount} of ${totalCount} quests completed today`}
          showGlow
          className="h-[3px]"
        />
      </div>

      <Card>
        <CardHeader className="pb-2 pt-5">
          <h2
            id="daily-quests-heading"
            className="font-display text-lg font-semibold leading-snug text-foreground"
          >
            Today&rsquo;s quests
          </h2>
          <p className="text-sm italic text-muted-foreground">3 missions, ~5 minutes.</p>
        </CardHeader>

        <CardContent className="pb-5">
          <Stagger className="flex flex-col gap-3">
            {quests.map((quest) => (
              <ScrollItem key={quest.slug}>
                <QuestCard quest={quest} onClaim={handleClaim} />
              </ScrollItem>
            ))}
          </Stagger>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Resets at midnight your time.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
