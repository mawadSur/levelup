import { z } from 'zod';
import type { PathGenerationStatus } from '@levelup/db';

// ---------------------------------------------------------------------------
// Generated path payload (mirrors @levelup/llm `generatedPathSchema`).
//
// We re-declare it here rather than importing from `@levelup/llm` because
// `packages/types` is a low-level package — pulling in the LLM package would
// create a dep cycle (LLM uses zod from this side too). Keep both schemas
// byte-equivalent — drift breaks the worker → API → web contract.
// ---------------------------------------------------------------------------

export const GENERATED_TARGET_LEVELS = [
  'BEGINNER',
  'PRACTITIONER',
  'POWER_USER',
  'CHAMPION',
] as const;
export type GeneratedTargetLevel = (typeof GENERATED_TARGET_LEVELS)[number];

export const generatedQuizQuestionSchema = z.object({
  prompt: z.string(),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});
export type GeneratedQuizQuestion = z.infer<typeof generatedQuizQuestionSchema>;

export const generatedQuizSchema = z.object({
  title: z.string(),
  questions: z.array(generatedQuizQuestionSchema).length(3),
});
export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;

export const generatedLessonSchema = z.object({
  slug: z.string(),
  title: z.string(),
  estimatedMinutes: z.number().int().min(3).max(30),
  body: z.string(),
  quiz: generatedQuizSchema,
});
export type GeneratedLesson = z.infer<typeof generatedLessonSchema>;

export const generatedPathSchema = z.object({
  title: z.string(),
  description: z.string(),
  targetRole: z.string().nullable(),
  targetLevel: z.enum(GENERATED_TARGET_LEVELS),
  lessons: z.array(generatedLessonSchema).length(6),
});
export type GeneratedPath = z.infer<typeof generatedPathSchema>;

// ---------------------------------------------------------------------------
// API request / response payloads
// ---------------------------------------------------------------------------

export const createPathRequestSchema = z.object({
  prompt: z.string().min(8).max(2000),
  audience: z.string().max(200).optional(),
});
export type CreatePathRequestInput = z.infer<typeof createPathRequestSchema>;

/**
 * Optional admin overrides applied to the generated draft before it is
 * materialized into a real LearningPath. Top-level fields shallow-merge over
 * the draft, lesson edits are matched by slug.
 */
export const generatedLessonEditSchema = z.object({
  slug: z.string(),
  title: z.string().min(1).max(200).optional(),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
  body: z.string().min(1).optional(),
});
export type GeneratedLessonEdit = z.infer<typeof generatedLessonEditSchema>;

export const generatedPathEditsSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(4000).optional(),
  targetRole: z.string().nullable().optional(),
  targetLevel: z.enum(GENERATED_TARGET_LEVELS).optional(),
  lessons: z.array(generatedLessonEditSchema).max(6).optional(),
});
export type GeneratedPathEdits = z.infer<typeof generatedPathEditsSchema>;

export const acceptPathRequestSchema = z.object({
  edits: generatedPathEditsSchema.optional(),
});
export type AcceptPathRequestInput = z.infer<typeof acceptPathRequestSchema>;

// Re-export the enum string-literal union so frontend code does not need the
// db package as a runtime dep.
export const pathGenerationStatusValues = [
  'PENDING',
  'GENERATING',
  'READY',
  'FAILED',
  'CANCELLED',
] as const;
export type PathGenerationStatusValue = (typeof pathGenerationStatusValues)[number];

// Sanity-check at type level that we stayed in sync with @levelup/db.
const _statusCheck: PathGenerationStatusValue = 'PENDING' satisfies PathGenerationStatus;
void _statusCheck;

export const pathGenerationRequestSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  requestedById: z.string(),
  prompt: z.string(),
  audience: z.string().nullable(),
  status: z.enum(pathGenerationStatusValues),
  failedReason: z.string().nullable(),
  generatedPathId: z.string().nullable(),
  draft: generatedPathSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type PathGenerationRequestDto = z.infer<typeof pathGenerationRequestSchema>;
