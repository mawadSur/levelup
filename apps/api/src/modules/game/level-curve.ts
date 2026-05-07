/**
 * Pure level / XP-curve helpers — no IO, deterministic, easy to unit-test.
 *
 * The curve is `cumulativeXp(level) = round(100 * level^1.6)`. We precompute
 * the thresholds for levels 1..50 once and freeze them. Level 1 is "you have
 * 0 XP and just signed up", so `LEVEL_THRESHOLDS[0] = 0`.
 */

export const MAX_LEVEL = 50;

function computeThreshold(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level, 1.6));
}

export const LEVEL_THRESHOLDS: readonly number[] = Object.freeze(
  Array.from({ length: MAX_LEVEL }, (_, i) => computeThreshold(i + 1)),
);

/**
 * Cumulative XP needed to be at the *start* of `level`. Level 1 → 0 XP.
 * Levels above MAX_LEVEL clamp to the MAX_LEVEL threshold.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const idx = Math.min(level, MAX_LEVEL) - 1;
  return LEVEL_THRESHOLDS[idx] ?? 0;
}

/**
 * Compute the level a player is at given their lifetime XP. Returns the level
 * whose threshold ≤ xp < next threshold. Clamped to MAX_LEVEL.
 */
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  // Walk thresholds from the top down — small constant array, simpler than
  // binary search and identical big-O for a 50-element table.
  for (let level = MAX_LEVEL; level >= 1; level -= 1) {
    const threshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
    if (xp >= threshold) {
      return level;
    }
  }
  return 1;
}

export interface XpToNextLevel {
  current: number;
  next: number;
  progress: number;
}

/**
 * Given lifetime XP, return the cumulative XP needed at the start of the
 * current level (`current`), the cumulative XP needed at the start of the
 * next level (`next`), and how far the user is into the current level
 * (`progress = xp - current`). At MAX_LEVEL, `next === current` and progress
 * stays at the level's worth of XP earned.
 */
export function xpToNextLevel(xp: number): XpToNextLevel {
  const level = levelFromXp(xp);
  const current = xpForLevel(level);
  const next = level >= MAX_LEVEL ? current : xpForLevel(level + 1);
  const progress = Math.max(0, xp - current);
  return { current, next, progress };
}
