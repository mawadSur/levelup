import { z } from 'zod';

// ---------------------------------------------------------------------------
// StudyPlan domain types
//
// StudyPlan rows are generated after the baseline assessment. Each row is a
// one-week target with a fixed lesson + lab list. The week is anchored to the
// Monday (UTC) of that week so the cadence is stable across timezones, and the
// targetCompletionDate is the Sunday 23:59 UTC of that week.
//
// Item status is computed on the API side by joining StudyPlan.lessonIds /
// labIds against UserProgress / LabAttempt — never persisted on the StudyPlan
// itself so a re-generation doesn't blow away progress.
// ---------------------------------------------------------------------------

export const studyPlanItemStatusSchema = z.enum(['not_started', 'in_progress', 'done']);
export type StudyPlanItemStatus = z.infer<typeof studyPlanItemStatusSchema>;

export const studyPlanLessonItemSchema = z.object({
  kind: z.literal('lesson'),
  lessonId: z.string(),
  title: z.string(),
  pathSlug: z.string(),
  lessonSlug: z.string(),
  estimatedMinutes: z.number().int().nonnegative(),
  status: studyPlanItemStatusSchema,
});
export type StudyPlanLessonItem = z.infer<typeof studyPlanLessonItemSchema>;

export const studyPlanLabItemSchema = z.object({
  kind: z.literal('lab'),
  labId: z.string(),
  title: z.string(),
  slug: z.string(),
  estimatedMinutes: z.number().int().nonnegative(),
  status: studyPlanItemStatusSchema,
});
export type StudyPlanLabItem = z.infer<typeof studyPlanLabItemSchema>;

export const studyPlanItemSchema = z.discriminatedUnion('kind', [
  studyPlanLessonItemSchema,
  studyPlanLabItemSchema,
]);
export type StudyPlanItem = z.infer<typeof studyPlanItemSchema>;

export const studyPlanWeekSchema = z.object({
  id: z.string(),
  weekOf: z.string(),
  targetCompletionDate: z.string(),
  completedAt: z.string().nullable(),
  weekIndex: z.number().int().min(1).max(4),
  items: z.array(studyPlanItemSchema),
  /** 0..1 progress fraction across all items in the week. */
  progress: z.number().min(0).max(1),
  totalItems: z.number().int().nonnegative(),
  doneItems: z.number().int().nonnegative(),
});
export type StudyPlanWeek = z.infer<typeof studyPlanWeekSchema>;

// ---------------------------------------------------------------------------
// Endpoint request/response schemas
// ---------------------------------------------------------------------------

export const currentWeekResponseSchema = z.object({
  plan: studyPlanWeekSchema.nullable(),
});
export type CurrentWeekResponse = z.infer<typeof currentWeekResponseSchema>;

export const upcomingPlansResponseSchema = z.object({
  plans: z.array(studyPlanWeekSchema),
});
export type UpcomingPlansResponse = z.infer<typeof upcomingPlansResponseSchema>;

export const generateStudyPlanInputSchema = z.object({
  /** Force regeneration even if a current-week plan already exists. */
  force: z.boolean().optional().default(false),
});
export type GenerateStudyPlanInput = z.infer<typeof generateStudyPlanInputSchema>;

export const generateStudyPlanResponseSchema = z.object({
  plans: z.array(studyPlanWeekSchema),
  /** True when nothing was generated (a plan already existed and force=false). */
  alreadyExists: z.boolean(),
});
export type GenerateStudyPlanResponse = z.infer<typeof generateStudyPlanResponseSchema>;

// ---------------------------------------------------------------------------
// Manager view — per-direct-report current week
// ---------------------------------------------------------------------------

export const teamStudyPlanIndicatorSchema = z.enum(['behind', 'on_track', 'ahead']);
export type TeamStudyPlanIndicator = z.infer<typeof teamStudyPlanIndicatorSchema>;

export const teamStudyPlanRowSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  hasPlan: z.boolean(),
  weekOf: z.string().nullable(),
  targetCompletionDate: z.string().nullable(),
  progress: z.number().min(0).max(1),
  doneItems: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  indicator: teamStudyPlanIndicatorSchema,
});
export type TeamStudyPlanRow = z.infer<typeof teamStudyPlanRowSchema>;

export const teamStudyPlanResponseSchema = z.object({
  rows: z.array(teamStudyPlanRowSchema),
});
export type TeamStudyPlanResponse = z.infer<typeof teamStudyPlanResponseSchema>;
