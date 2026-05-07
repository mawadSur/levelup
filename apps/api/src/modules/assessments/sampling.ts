/**
 * sampling.ts — deterministic-but-random item sampling for LevelUp assessments.
 *
 * Rules:
 *  - Pull AssessmentItem rows where organizationId IS NULL OR organizationId = currentOrg.
 *  - Group by level; require at least the configured count per level (7/9/8/6).
 *  - Seed: `${userId}|${type}|${utcDate}` — same user same day → same sample.
 *  - Interleave items across levels so order does not reveal level grouping.
 *
 * PRNG: mulberry32 — a fast, seedable 32-bit PRNG with good randomness properties.
 * Fingerprint: SHA-256 hex of `sorted(itemIds).join(',')` — deterministic per item set.
 */

import { createHash } from 'crypto';
import type { AssessmentItem, AssessmentType } from '@levelup/db';
import { AiLevel } from '@levelup/db';
import { InternalServerErrorException } from '@nestjs/common';

/** Number of items to draw per level (total = 30). */
export const SAMPLE_COUNTS: Record<AiLevel, number> = {
  [AiLevel.BEGINNER]: 7,
  [AiLevel.PRACTITIONER]: 9,
  [AiLevel.POWER_USER]: 8,
  [AiLevel.CHAMPION]: 6,
};

/** Ordered list of levels used for stable interleaving. */
const LEVELS: AiLevel[] = [
  AiLevel.BEGINNER,
  AiLevel.PRACTITIONER,
  AiLevel.POWER_USER,
  AiLevel.CHAMPION,
];

// ---------------------------------------------------------------------------
// mulberry32 PRNG — produces floats in [0, 1)
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a string seed into a numeric seed for mulberry32.
 * Uses the djb2 hash which is compact and well-distributed.
 */
function djb2(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
    hash = hash >>> 0; // keep 32-bit unsigned
  }
  return hash;
}

/**
 * Fisher-Yates shuffle driven by the provided PRNG.
 */
function shuffleWithPrng<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    // TypeScript needs explicit access pattern for swap
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/**
 * Build the string seed for a given (userId, type, utcDate) triple.
 * utcDate defaults to today's UTC date (YYYY-MM-DD).
 */
export function buildSeedString(userId: string, type: AssessmentType, utcDate?: string): string {
  const date = utcDate ?? new Date().toISOString().slice(0, 10);
  return `${userId}|${type}|${date}`;
}

/**
 * Compute a stable fingerprint for an item set.
 * The fingerprint is SHA-256( sorted item IDs joined by ',' ).
 * It is used to validate that a submit's item set matches what was sampled.
 */
export function fingerprintItems(itemIds: string[]): string {
  const sorted = itemIds.slice().sort();
  return createHash('sha256').update(sorted.join(',')).digest('hex');
}

/**
 * Sample 30 AssessmentItems deterministically.
 *
 * @param allItems     - All items accessible to this org (null + org-specific).
 * @param userId       - The current user's id.
 * @param type         - The assessment type (used as part of the seed).
 * @param utcDate      - Optional override for the UTC date (YYYY-MM-DD); useful in tests.
 * @returns            - `{ items, sessionId }` where `sessionId` is the fingerprint
 *                       that must round-trip through the submit body.
 */
export function sampleItems(
  allItems: AssessmentItem[],
  userId: string,
  type: AssessmentType,
  utcDate?: string,
): { items: AssessmentItem[]; sessionId: string } {
  // Group by level.
  const byLevel: Record<AiLevel, AssessmentItem[]> = {
    [AiLevel.BEGINNER]: [],
    [AiLevel.PRACTITIONER]: [],
    [AiLevel.POWER_USER]: [],
    [AiLevel.CHAMPION]: [],
  };

  for (const item of allItems) {
    byLevel[item.level].push(item);
  }

  // Validate bank size per level.
  for (const level of LEVELS) {
    const required = SAMPLE_COUNTS[level];
    const available = byLevel[level].length;
    if (available < required) {
      throw new InternalServerErrorException(
        `Assessment item bank too small for level ${level}: need ${required}, have ${available}. Run the seed script to add more items.`,
      );
    }
  }

  const seedString = buildSeedString(userId, type, utcDate);
  const rand = mulberry32(djb2(seedString));

  // Shuffle each level's pool and take the required count.
  const sampledByLevel: Record<AiLevel, AssessmentItem[]> = {
    [AiLevel.BEGINNER]: shuffleWithPrng(byLevel[AiLevel.BEGINNER], rand).slice(
      0,
      SAMPLE_COUNTS[AiLevel.BEGINNER],
    ),
    [AiLevel.PRACTITIONER]: shuffleWithPrng(byLevel[AiLevel.PRACTITIONER], rand).slice(
      0,
      SAMPLE_COUNTS[AiLevel.PRACTITIONER],
    ),
    [AiLevel.POWER_USER]: shuffleWithPrng(byLevel[AiLevel.POWER_USER], rand).slice(
      0,
      SAMPLE_COUNTS[AiLevel.POWER_USER],
    ),
    [AiLevel.CHAMPION]: shuffleWithPrng(byLevel[AiLevel.CHAMPION], rand).slice(
      0,
      SAMPLE_COUNTS[AiLevel.CHAMPION],
    ),
  };

  // Interleave: round-robin across levels so the UI doesn't reveal level via question order.
  const interleaved: AssessmentItem[] = [];
  const levelQueues = LEVELS.map((l) => sampledByLevel[l].slice());
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const q of levelQueues) {
      const item = q.shift();
      if (item !== undefined) {
        interleaved.push(item);
        hasMore = true;
      }
    }
  }

  const sessionId = fingerprintItems(interleaved.map((i) => i.id));

  return { items: interleaved, sessionId };
}
