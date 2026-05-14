import { z } from 'zod';

/**
 * CoachNudge kind enum — kept in lock-step with the Prisma `CoachNudgeKind`
 * enum. Re-declared as a zod enum (rather than imported from @levelup/db) so
 * the wire schema does not require a Prisma client at validation time.
 */
export const coachNudgeKindSchema = z.enum([
  'REPEATED_SENSITIVE_PASTE',
  'PROMPT_PATTERN_STUCK',
  'UNTOUCHED_SKILL_AFTER_LESSON',
  'STREAK_AT_RISK',
]);
export type CoachNudgeKindWire = z.infer<typeof coachNudgeKindSchema>;

/**
 * Wire shape of one active nudge. `body` is the user-facing message; the
 * optional `suggestedTemplate` is what we open the coach with when the user
 * taps "Try it".
 */
export const coachNudgeSchema = z.object({
  id: z.string(),
  kind: coachNudgeKindSchema,
  body: z.string(),
  suggestedTemplate: z.string().nullable(),
  generatedAt: z.string(),
  dismissedAt: z.string().nullable(),
  actedOnAt: z.string().nullable(),
});
export type CoachNudgeDto = z.infer<typeof coachNudgeSchema>;

export const listCoachNudgesResponseSchema = z.object({
  items: z.array(coachNudgeSchema),
});
export type ListCoachNudgesResponse = z.infer<typeof listCoachNudgesResponseSchema>;

/**
 * Per-user cap on visible / active nudges. The generator enforces this at
 * write time (auto-dismisses the oldest when a fresh one would push us over)
 * and the API enforces it at read time as defence-in-depth.
 */
export const COACH_NUDGE_VISIBLE_CAP = 3;

/**
 * Active window — nudges older than this are not surfaced even if not
 * explicitly dismissed. Mirrors the cleanup guard inside the read endpoint.
 */
export const COACH_NUDGE_ACTIVE_WINDOW_DAYS = 7;
