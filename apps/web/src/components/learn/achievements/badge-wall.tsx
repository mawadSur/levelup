'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@levelup/ui';
import { CountUp } from '@/lib/motion/count-up';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';
import { BadgeCard } from './badge-card';
import {
  BADGE_CATALOG,
  RARITY_ORDER,
  RARITY_LABELS,
  type BadgeDef,
  type Rarity,
} from './badge-catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EarnedBadgeInfo {
  slug: string;
  awardedAt?: Date;
}

export interface BadgeWallProps {
  /**
   * Slugs (+ optional award dates) that the current user has earned.
   * Server-side callers can pass a richer array; client can pass string[].
   */
  earnedBadges: EarnedBadgeInfo[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ALL_TABS = ['All', ...RARITY_ORDER] as const;
type TabValue = (typeof ALL_TABS)[number];

function tabLabel(tab: TabValue): string {
  if (tab === 'All') return 'All';
  return RARITY_LABELS[tab as Rarity];
}

function badgesForTab(tab: TabValue): BadgeDef[] {
  if (tab === 'All') return BADGE_CATALOG;
  return BADGE_CATALOG.filter((b) => b.rarity === (tab as Rarity));
}

// ---------------------------------------------------------------------------
// BadgeWall
// ---------------------------------------------------------------------------
export function BadgeWall({ earnedBadges }: BadgeWallProps) {
  const earnedSet = React.useMemo(() => new Set(earnedBadges.map((e) => e.slug)), [earnedBadges]);

  const earnedCount = BADGE_CATALOG.filter((b) => earnedSet.has(b.slug)).length;
  const totalCount = BADGE_CATALOG.length;

  function getAwardedAt(slug: string): Date | undefined {
    const entry = earnedBadges.find((e) => e.slug === slug);
    return entry?.awardedAt;
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-serif text-3xl font-bold text-paper-100">
          <CountUp value={earnedCount} />
        </span>
        <span className="text-sm text-paper-300">/ {totalCount} badges earned</span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="All">
        <TabsList className="mb-4 flex flex-wrap gap-1 h-auto">
          {ALL_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-xs sm:text-sm">
              {tabLabel(tab)}
            </TabsTrigger>
          ))}
        </TabsList>

        {ALL_TABS.map((tab) => {
          const badges = badgesForTab(tab);
          return (
            <TabsContent key={tab} value={tab}>
              <Stagger className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {badges.map((badge) => {
                  const earned = earnedSet.has(badge.slug);
                  const awardedAt = getAwardedAt(badge.slug);
                  return (
                    <ScrollItem key={badge.slug}>
                      <BadgeCard badge={badge} earned={earned} awardedAt={awardedAt} />
                    </ScrollItem>
                  );
                })}
              </Stagger>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
