import { z } from 'zod';
import { BadgeRarity } from '@levelup/db';

// ---------------------------------------------------------------------------
// Badge view
// ---------------------------------------------------------------------------
export const badgeViewSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  description: z.string().optional(),
  iconKey: z.string().optional(),
  rarity: z.nativeEnum(BadgeRarity).optional(),
  xpReward: z.number().optional(),
  awardedAt: z.string(), // ISO
});
export type BadgeView = z.infer<typeof badgeViewSchema>;

export const badgeListSchema = z.array(badgeViewSchema);

// ---------------------------------------------------------------------------
// Activity event
// ---------------------------------------------------------------------------
export const activityEventSchema = z.object({
  id: z.string(),
  type: z.enum(['lesson_completed', 'quiz_attempted', 'certificate_earned', 'badge_earned']),
  occurredAt: z.string(), // ISO
  title: z.string(),
  meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type ActivityEvent = z.infer<typeof activityEventSchema>;

export const userActivitySchema = z.array(activityEventSchema);

// ---------------------------------------------------------------------------
// Self-profile updates (PATCH /users/me)
// ---------------------------------------------------------------------------
export const updateMyProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  jobTitle: z.string().max(120).optional(),
  avatarUrl: z.string().url().optional(),
});
export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;
