// Server component wrapper + client interactive panel

import { game } from '@/lib/api';
import type { DailyQuestItem } from '@levelup/types';
import { DailyQuestPanelClient } from './daily-quest-panel-client';

// ---------------------------------------------------------------------------
// Server component — fetches quests then delegates to the client component.
// Tolerates API errors: if the fetch fails, renders nothing.
// ---------------------------------------------------------------------------

interface DailyQuestPanelProps {
  /** Pre-fetched quests (passed by the parent page to avoid double-fetching). */
  initialQuests?: DailyQuestItem[];
}

export async function DailyQuestPanel({ initialQuests }: DailyQuestPanelProps) {
  // If the page already fetched and passed quests, use them.
  if (initialQuests !== undefined) {
    return <DailyQuestPanelClient initialQuests={initialQuests} />;
  }

  // Otherwise fetch server-side.
  try {
    const data = await game.getTodayQuests();
    return <DailyQuestPanelClient initialQuests={data.quests} />;
  } catch {
    // Never crash the page; quest panel is additive.
    return null;
  }
}
