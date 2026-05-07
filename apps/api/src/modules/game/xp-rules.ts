import type { XpEventKind } from '@levelup/db';

/**
 * Canonical per-event XP table. Centralising it here means the wiring
 * services only refer to event kinds and never bake numeric XP values into
 * their own logic.
 *
 * `BADGE_BONUS` resolves to 0 by default and must be overridden via
 * `xpOverride` on the GameService.awardXp call (the badge meta carries the
 * actual reward).
 */
export const XP_AWARDS: Record<XpEventKind, number> = {
  LESSON_COMPLETED: 25,
  LESSON_FIRST_TIME: 50,
  QUIZ_PASSED_FIRST_TRY: 30,
  QUIZ_PASSED_RETRY: 15,
  PATH_COMPLETED: 200,
  COACH_PROMPT_FIXED: 20,
  PROMPT_CLONED: 15,
  DAILY_QUEST: 40,
  STREAK_7: 100,
  STREAK_30: 500,
  ASSESSMENT_BASELINE: 50,
  BADGE_BONUS: 0,
};

/**
 * Compute the XP awarded for a given event kind, optionally allowing the
 * meta payload to override (only used for BADGE_BONUS today).
 */
export function xpForKind(kind: XpEventKind, meta?: Record<string, unknown>): number {
  if (kind === 'BADGE_BONUS') {
    const override = meta?.['xpReward'];
    if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
      return Math.floor(override);
    }
    return XP_AWARDS.BADGE_BONUS;
  }
  return XP_AWARDS[kind];
}
