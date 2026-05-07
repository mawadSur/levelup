/**
 * Pure streak math. `applyDailyActivity` takes the relevant slice of
 * UserGameState plus today's UTC date and returns the streak deltas.
 *
 * Streak rules:
 *   - Same UTC day as lastActiveDate     → no change.
 *   - Yesterday                          → currentStreak += 1.
 *   - 2+ day gap, freezes available      → consume one freeze, treat as
 *                                          continuous (does not increment).
 *   - 2+ day gap, no freezes             → reset to 1 (today still counts).
 *   - First-ever activity (null prev)    → start at 1.
 *
 * Freezes are consumed at most once per call (we don't try to span huge
 * gaps with multiple freezes — that would feel cheaty).
 */

export interface StreakSnapshot {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  lastActiveDate: Date | null;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  streakFreezesUsed: number;
  changed: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Truncate a Date to the start of its UTC day. */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

/** Calendar-day delta in UTC. Same day → 0; yesterday → 1; tomorrow → -1. */
export function daysBetweenUtc(from: Date, to: Date): number {
  const a = startOfUtcDay(from).getTime();
  const b = startOfUtcDay(to).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

export function applyDailyActivity(state: StreakSnapshot, today: Date): StreakResult {
  const todayUtc = startOfUtcDay(today);

  // First ever activity — bootstrap to streak 1.
  if (!state.lastActiveDate) {
    const currentStreak = 1;
    return {
      currentStreak,
      longestStreak: Math.max(state.longestStreak, currentStreak),
      streakFreezes: state.streakFreezes,
      streakFreezesUsed: 0,
      changed: true,
    };
  }

  const gap = daysBetweenUtc(state.lastActiveDate, todayUtc);

  if (gap <= 0) {
    // Same day or before — no streak movement.
    return {
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      streakFreezes: state.streakFreezes,
      streakFreezesUsed: 0,
      changed: false,
    };
  }

  if (gap === 1) {
    const currentStreak = state.currentStreak + 1;
    return {
      currentStreak,
      longestStreak: Math.max(state.longestStreak, currentStreak),
      streakFreezes: state.streakFreezes,
      streakFreezesUsed: 0,
      changed: true,
    };
  }

  // 2+ day gap.
  if (state.streakFreezes > 0) {
    // Consume one freeze, keep streak — but DO NOT advance it (the freeze
    // was used to cover the missed day, not to earn one).
    const currentStreak = state.currentStreak;
    return {
      currentStreak,
      longestStreak: Math.max(state.longestStreak, currentStreak),
      streakFreezes: state.streakFreezes - 1,
      streakFreezesUsed: 1,
      changed: true,
    };
  }

  // No freeze — reset, but today still counts.
  const currentStreak = 1;
  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    streakFreezes: state.streakFreezes,
    streakFreezesUsed: 0,
    changed: true,
  };
}

/**
 * Returns true when the streak just *crossed* the given threshold from
 * `prev` to `next` (so we award STREAK_7 once when the user hits 7, etc).
 */
export function crossedThreshold(prev: number, next: number, threshold: number): boolean {
  return prev < threshold && next >= threshold;
}
