import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const insightsPeriodSchema = z.enum(['week', 'month', 'all']);
export type InsightsPeriod = z.infer<typeof insightsPeriodSchema>;

export const insightsTrendPeriodSchema = z.enum(['30', '90', '365']);
export type InsightsTrendPeriod = z.infer<typeof insightsTrendPeriodSchema>;

export const insightsTrendIntervalSchema = z.enum(['day', 'week']);
export type InsightsTrendInterval = z.infer<typeof insightsTrendIntervalSchema>;

// ---------------------------------------------------------------------------
// GET /insights/top-prompts
// ---------------------------------------------------------------------------

export const topPromptItemSchema = z.object({
  promptId: z.string(),
  title: z.string(),
  category: z.string(),
  authorName: z.string(),
  departmentName: z.string().nullable(),
  cloneCount: z.number().int().min(0),
  isShared: z.boolean(),
});

export const topPromptsResponseSchema = z.object({
  prompts: z.array(topPromptItemSchema),
});

export type TopPromptItem = z.infer<typeof topPromptItemSchema>;
export type TopPromptsResponse = z.infer<typeof topPromptsResponseSchema>;

// ---------------------------------------------------------------------------
// GET /insights/top-saved-prompts
// ---------------------------------------------------------------------------

export const topSavedPromptItemSchema = z.object({
  promptId: z.string(),
  title: z.string(),
  category: z.string(),
  authorName: z.string(),
  departmentName: z.string().nullable(),
  saveCount: z.number().int().min(0),
  isShared: z.boolean(),
});

export const topSavedPromptsResponseSchema = z.object({
  prompts: z.array(topSavedPromptItemSchema),
});

export type TopSavedPromptItem = z.infer<typeof topSavedPromptItemSchema>;
export type TopSavedPromptsResponse = z.infer<typeof topSavedPromptsResponseSchema>;

// ---------------------------------------------------------------------------
// GET /insights/usage-trend
// ---------------------------------------------------------------------------

export const usageTrendBucketSchema = z.object({
  bucketStart: z.string(),
  coachInvocations: z.number().int().min(0),
  lessonsCompleted: z.number().int().min(0),
  promptsSaved: z.number().int().min(0),
  xpEarned: z.number().int().min(0),
});

export const usageTrendResponseSchema = z.object({
  buckets: z.array(usageTrendBucketSchema),
  totals: z.object({
    coachInvocations: z.number().int().min(0),
    lessonsCompleted: z.number().int().min(0),
    promptsSaved: z.number().int().min(0),
    xpEarned: z.number().int().min(0),
  }),
});

export type UsageTrendBucket = z.infer<typeof usageTrendBucketSchema>;
export type UsageTrendResponse = z.infer<typeof usageTrendResponseSchema>;

// ---------------------------------------------------------------------------
// GET /insights/saves-prevented
// ---------------------------------------------------------------------------

export const savesCategoryCountSchema = z.object({
  category: z.string(),
  count: z.number().int().min(0),
});

export const savesPreventedExampleSchema = z.object({
  occurredAt: z.string(),
  userName: z.string(),
  categories: z.array(z.string()),
});

export const savesPreventedResponseSchema = z.object({
  totalDetections: z.number().int().min(0),
  uniqueUsersAffected: z.number().int().min(0),
  byCategory: z.array(savesCategoryCountSchema),
  recentExamples: z.array(savesPreventedExampleSchema),
});

export type SavesCategoryCount = z.infer<typeof savesCategoryCountSchema>;
export type SavesPreventedExample = z.infer<typeof savesPreventedExampleSchema>;
export type SavesPreventedResponse = z.infer<typeof savesPreventedResponseSchema>;

// ---------------------------------------------------------------------------
// GET /insights/category-mix
// ---------------------------------------------------------------------------

export const categoryMixSegmentSchema = z.object({
  category: z.string(),
  count: z.number().int().min(0),
  pct: z.number().min(0).max(100),
});

export const categoryMixResponseSchema = z.object({
  segments: z.array(categoryMixSegmentSchema),
});

export type CategoryMixSegment = z.infer<typeof categoryMixSegmentSchema>;
export type CategoryMixResponse = z.infer<typeof categoryMixResponseSchema>;
