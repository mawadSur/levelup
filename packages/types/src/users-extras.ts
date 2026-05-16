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

/**
 * Org-scoped activity event — extends ActivityEvent with the actor's
 * user id + display name so the admin dashboard's stream can render
 * "Jane completed lesson X" rather than the per-user "Completed lesson X".
 */
export const orgActivityEventSchema = activityEventSchema.extend({
  userId: z.string(),
  userName: z.string(),
});
export type OrgActivityEvent = z.infer<typeof orgActivityEventSchema>;

export const orgActivitySchema = z.array(orgActivityEventSchema);

// ---------------------------------------------------------------------------
// Self-profile updates (PATCH /users/me)
// ---------------------------------------------------------------------------
export const updateMyProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  jobTitle: z.string().max(120).optional(),
  avatarUrl: z.string().url().optional(),
});
export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;

// ---------------------------------------------------------------------------
// Leaderboard opt-out toggle (PATCH /users/me/leaderboard-opt-out)
// ---------------------------------------------------------------------------
export const leaderboardOptOutSchema = z.object({
  optOut: z.boolean(),
});
export type LeaderboardOptOutInput = z.infer<typeof leaderboardOptOutSchema>;
