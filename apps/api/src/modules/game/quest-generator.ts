import { Role } from '@levelup/db';
import type { DailyQuestItem, DailyQuestKind } from '@levelup/types';
import { XP_AWARDS } from './xp-rules';

/**
 * Pure daily-quest generator. Given (userId, role, date), pick 3 distinct
 * quest templates deterministically so the same user gets the same quests
 * for the same date (refreshing tomorrow). Templates are mildly biased by
 * role: managers get a "review your team" flavour quest, sales gets sales
 * copy. Defaults to a generic worker template otherwise.
 */

export interface QuestTemplate {
  slug: string;
  title: string;
  kind: DailyQuestKind;
  target: number;
  xpReward: number;
}

const BASE_TEMPLATES: readonly QuestTemplate[] = [
  {
    slug: 'complete-one-lesson',
    title: 'Complete one lesson',
    kind: 'lesson',
    target: 1,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
  {
    slug: 'talk-to-coach',
    title: 'Talk to your AI Coach once',
    kind: 'coach',
    target: 1,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
  {
    slug: 'save-a-prompt',
    title: 'Save a prompt to your library',
    kind: 'prompt',
    target: 1,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
  {
    slug: 'pass-quiz-first-try',
    title: 'Pass a quiz on first try',
    kind: 'quiz',
    target: 1,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
  {
    slug: 'read-ten-minutes',
    title: 'Read for 10 minutes',
    kind: 'streak',
    target: 600,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
  {
    slug: 'practice-three-prompts',
    title: 'Practice 3 different prompts',
    kind: 'prompt',
    target: 3,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
];

const SALES_TEMPLATES: readonly QuestTemplate[] = [
  {
    slug: 'sales-coach-pitch',
    title: 'Run an outreach pitch through the AI Coach',
    kind: 'coach',
    target: 1,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
  {
    slug: 'sales-save-objection-prompt',
    title: 'Save an objection-handling prompt',
    kind: 'prompt',
    target: 1,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
];

const MANAGER_TEMPLATES: readonly QuestTemplate[] = [
  {
    slug: 'manager-review-prompt',
    title: 'Review and share a team prompt',
    kind: 'prompt',
    target: 1,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
  {
    slug: 'manager-coach-1on1',
    title: 'Draft a 1:1 plan with the AI Coach',
    kind: 'coach',
    target: 1,
    xpReward: XP_AWARDS.DAILY_QUEST,
  },
];

/**
 * 32-bit FNV-1a — deterministic, fast, no crypto dependency. We only need a
 * stable shuffle seed, not security.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // Multiply by FNV prime, mod 2^32.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG seeded from a 32-bit integer. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** YYYY-MM-DD in UTC. Stable input for the per-day seed. */
export function isoDateUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function templatesForRole(role: Role, jobTitle?: string | null): readonly QuestTemplate[] {
  const lowerTitle = jobTitle?.toLowerCase() ?? '';
  const base = [...BASE_TEMPLATES];
  if (role === Role.MANAGER || role === Role.ADMIN) {
    return [...base, ...MANAGER_TEMPLATES];
  }
  if (lowerTitle.includes('sales')) {
    return [...base, ...SALES_TEMPLATES];
  }
  return base;
}

function pickDistinct<T>(pool: readonly T[], count: number, rng: () => number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i += 1) {
    const idx = Math.floor(rng() * copy.length);
    const [picked] = copy.splice(idx, 1);
    if (picked !== undefined) out.push(picked);
  }
  return out;
}

export interface GenerateQuestsInput {
  userId: string;
  role: Role;
  jobTitle?: string | null;
  date: Date;
}

/** Returns 3 deterministic, distinct DailyQuestItems for the given user/day. */
export function generateDailyQuests(input: GenerateQuestsInput): DailyQuestItem[] {
  const dateIso = isoDateUtc(input.date);
  const seed = fnv1a(`${input.userId}:${dateIso}:${input.role}`);
  const rng = mulberry32(seed);
  const pool = templatesForRole(input.role, input.jobTitle ?? null);
  const picked = pickDistinct(pool, 3, rng);
  return picked.map((t) => ({
    slug: t.slug,
    title: t.title,
    kind: t.kind,
    target: t.target,
    progress: 0,
    claimed: false,
    xpReward: t.xpReward,
  }));
}
