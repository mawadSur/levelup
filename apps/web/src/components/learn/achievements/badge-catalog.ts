// ---------------------------------------------------------------------------
// Badge Catalog — static definitions for every badge a user can earn.
// The backend Badge model stores { slug, label, awardedAt, rarity, xpReward,
// description, iconKey }. This catalog drives the badge wall, providing the
// "locked" tiles and unlock hints even before a badge is earned.
// ---------------------------------------------------------------------------

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface BadgeDef {
  slug: string;
  label: string;
  description: string;
  rarity: Rarity;
  /** Human-readable guidance shown on locked badge hover. */
  unlockHint: string;
  /** Matches a lucide-react icon name; rendered by BadgeCard. */
  iconKey: string;
  xpReward: number;
}

export const BADGE_CATALOG: BadgeDef[] = [
  {
    slug: 'first-lesson',
    label: 'First Lesson',
    description: 'Completed your very first lesson.',
    rarity: 'COMMON',
    unlockHint: 'Complete any lesson.',
    iconKey: 'BookOpen',
    xpReward: 25,
  },
  {
    slug: 'first-prompt-saved',
    label: 'Library Builder',
    description: 'Saved your first prompt to the library.',
    rarity: 'COMMON',
    unlockHint: 'Save a prompt from the AI coach.',
    iconKey: 'BookmarkPlus',
    xpReward: 25,
  },
  {
    slug: 'first-quiz-perfect',
    label: 'Sharpshooter',
    description: 'Aced a quiz on the very first try.',
    rarity: 'COMMON',
    unlockHint: 'Pass any quiz on your first attempt.',
    iconKey: 'Star',
    xpReward: 30,
  },
  {
    slug: 'first-coach-fix',
    label: 'Sharp Eye',
    description: 'Fixed a prompt that flagged sensitive data.',
    rarity: 'RARE',
    unlockHint: 'When the coach flags sensitive data, revise your prompt to remove it.',
    iconKey: 'ShieldCheck',
    xpReward: 50,
  },
  {
    slug: 'team-shared-prompt',
    label: 'Generous Mind',
    description: 'Had your prompt cloned by a teammate.',
    rarity: 'RARE',
    unlockHint: 'Save a shared prompt that a teammate clones.',
    iconKey: 'Sparkles',
    xpReward: 50,
  },
  {
    slug: 'streak-7',
    label: 'Week Warrior',
    description: 'Maintained a 7-day learning streak.',
    rarity: 'RARE',
    unlockHint: 'Earn XP for 7 consecutive days.',
    iconKey: 'Flame',
    xpReward: 100,
  },
  {
    slug: 'path-basics',
    label: 'AI Basics Graduate',
    description: 'Completed the AI Basics learning path.',
    rarity: 'EPIC',
    unlockHint: 'Finish every lesson in AI Basics.',
    iconKey: 'Award',
    xpReward: 200,
  },
  {
    slug: 'path-sales',
    label: 'Sales Practitioner',
    description: 'Completed the AI for Sales learning path.',
    rarity: 'EPIC',
    unlockHint: 'Finish every lesson in AI for Sales.',
    iconKey: 'Trophy',
    xpReward: 200,
  },
  {
    slug: 'path-managers',
    label: 'Manager Practitioner',
    description: 'Completed the AI for Managers learning path.',
    rarity: 'EPIC',
    unlockHint: 'Finish every lesson in AI for Managers.',
    iconKey: 'Trophy',
    xpReward: 200,
  },
  {
    slug: 'path-support',
    label: 'Support Practitioner',
    description: 'Completed the AI for Customer Support learning path.',
    rarity: 'EPIC',
    unlockHint: 'Finish every lesson in AI for Customer Support.',
    iconKey: 'Trophy',
    xpReward: 200,
  },
  {
    slug: 'path-hr',
    label: 'HR Practitioner',
    description: 'Completed the AI for HR learning path.',
    rarity: 'EPIC',
    unlockHint: 'Finish every lesson in AI for HR.',
    iconKey: 'Trophy',
    xpReward: 200,
  },
  {
    slug: 'baseline-champion',
    label: 'Champion Baseline',
    description: 'Scored at the Champion level on the baseline assessment.',
    rarity: 'EPIC',
    unlockHint: 'Score Champion on the baseline AI assessment.',
    iconKey: 'Crown',
    xpReward: 100,
  },
  {
    slug: 'streak-30',
    label: 'Marathoner',
    description: 'Maintained a 30-day learning streak.',
    rarity: 'LEGENDARY',
    unlockHint: 'Earn XP for 30 consecutive days.',
    iconKey: 'Crown',
    xpReward: 500,
  },
  {
    slug: 'top-learner',
    label: 'Top Learner',
    description: 'Reached #1 on the leaderboard for a full week.',
    rarity: 'LEGENDARY',
    unlockHint: 'Hold the #1 spot on the weekly org leaderboard.',
    iconKey: 'Trophy',
    xpReward: 500,
  },
];

/** Look up a badge definition by slug. Returns undefined if not found. */
export function findBadgeDef(slug: string): BadgeDef | undefined {
  return BADGE_CATALOG.find((b) => b.slug === slug);
}

/** Rarity display order (ascending). */
export const RARITY_ORDER: Rarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

/** Human-readable rarity labels. */
export const RARITY_LABELS: Record<Rarity, string> = {
  COMMON: 'Common',
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
};
