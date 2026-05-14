import { z } from 'zod';
import {
  coachNudgeKindSchema,
  coachNudgeSchema,
  listCoachNudgesResponseSchema,
  type CoachNudgeDto,
  type ListCoachNudgesResponse,
} from '@levelup/types';

/**
 * Path parameter schema for nudge mutation routes — defensive cuid check so
 * obvious garbage is bounced before we hit the DB.
 */
export const nudgeIdParamSchema = z.object({
  id: z.string().min(1).max(40),
});
export type NudgeIdParam = z.infer<typeof nudgeIdParamSchema>;

// Re-export the canonical wire schemas so controllers and tests share a single
// source of truth via @levelup/types.
export { coachNudgeKindSchema, coachNudgeSchema, listCoachNudgesResponseSchema };
export type { CoachNudgeDto, ListCoachNudgesResponse };
