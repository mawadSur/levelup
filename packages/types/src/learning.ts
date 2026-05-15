import { z } from 'zod';
import { AiLevel, AssessmentType, LessonKind, LessonStatus, Role } from '@levelup/db';

export const assignLearningPathSchema = z.object({
  learningPathId: z.string().cuid(),
  userIds: z.array(z.string().cuid()).min(1).max(500),
});
export type AssignLearningPathInput = z.infer<typeof assignLearningPathSchema>;

export const createLearningPathSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
  description: z.string().max(2000).optional(),
  targetRole: z.nativeEnum(Role).nullable().optional(),
  targetLevel: z.nativeEnum(AiLevel),
  coverImageUrl: z.string().url().optional(),
  isPublished: z.boolean().default(false),
});
export type CreateLearningPathInput = z.infer<typeof createLearningPathSchema>;

export const submitQuizAttemptSchema = z.object({
  quizId: z.string().cuid(),
  answers: z.array(z.number().int().min(0)).min(1).max(50),
});
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;

/**
 * SEV-17: `correctAnswers` and `explanations` are withheld on a failing
 * attempt until the user has exhausted MAX_ATTEMPTS_BEFORE_REVEAL (currently
 * 3) failed attempts. The schema therefore makes them optional, and
 * `attemptsRemaining` tells the UI how many more failing attempts a learner
 * has before the answers are revealed (`null` when they're already included).
 */
export const quizAttemptResultSchema = z.object({
  attemptId: z.string().cuid(),
  score: z.number().int().min(0).max(100),
  total: z.number().int().min(0),
  passed: z.boolean(),
  attemptsRemaining: z.number().int().nullable(),
  correctAnswers: z.array(z.number().int().min(0)).optional(),
  explanations: z.record(z.string(), z.string()).optional(),
});
export type QuizAttemptResult = z.infer<typeof quizAttemptResultSchema>;

export const updateLessonProgressSchema = z.object({
  lessonId: z.string().cuid(),
  status: z.nativeEnum(LessonStatus),
  score: z.number().int().min(0).max(100).optional(),
});
export type UpdateLessonProgressInput = z.infer<typeof updateLessonProgressSchema>;

export const submitAssessmentSchema = z.object({
  // Fingerprint returned by /assessments/start. The server uses it to verify
  // the submitted item set was not tampered with; the client must round-trip
  // it back unchanged on /assessments/submit.
  assessmentSessionId: z.string().min(1),
  type: z.nativeEnum(AssessmentType),
  itemResponses: z
    .array(
      z.object({
        itemId: z.string().cuid(),
        choiceIndex: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(100),
});
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;

export const assessmentResultSchema = z.object({
  assessmentId: z.string().cuid(),
  score: z.number().int().min(0),
  total: z.number().int().min(0),
  /**
   * Per-level percentage (0–100). The server flattens its richer internal
   * breakdown (correct/total/ratio) to a single number per level so the UI
   * doesn't have to synthesise it from the overall score + recommended level.
   */
  scoreByLevel: z.record(z.nativeEnum(AiLevel), z.number().int().min(0).max(100)),
  recommendedLevel: z.nativeEnum(AiLevel),
  message: z.string().optional(),
});
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;

/**
 * Bulk team progress endpoint payloads.
 *
 * `getTeamProgressBodySchema` validates the POST body — POST is used instead of
 * GET because the userIds list can exceed the practical URL length cap (a team
 * with 200 reports + 25-char cuids is over 5 KB just for the query string).
 */
export const getTeamProgressBodySchema = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(200),
});
export type GetTeamProgressBody = z.infer<typeof getTeamProgressBodySchema>;

export const teamProgressEntrySchema = z.object({
  userId: z.string(),
  assignedPaths: z.number().int().min(0),
  completedLessons: z.number().int().min(0),
  totalLessons: z.number().int().min(0),
  completionRate: z.number().min(0).max(1),
  lastActiveAt: z.string().nullable(),
});
export type TeamProgressEntry = z.infer<typeof teamProgressEntrySchema>;

export const teamProgressSchema = z.array(teamProgressEntrySchema);
export type TeamProgress = z.infer<typeof teamProgressSchema>;

// ---------------------------------------------------------------------------
// Lesson — serialised shape returned by GET /lessons/:id and embedded by
// GET /paths/:pathId/lessons (list view).
//
// `quizId` is surfaced directly so the lesson page can navigate to the quiz
// via `/quizzes/:id` instead of probing a non-existent by-lesson route.
// ---------------------------------------------------------------------------

export const lessonImageAssetSchema = z.object({
  slot: z.number().int().min(0),
  blobUrl: z.string(),
});
export type LessonImageAsset = z.infer<typeof lessonImageAssetSchema>;

export const lessonLabSummarySchema = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  title: z.string(),
  brief: z.string(),
  estimatedMinutes: z.number().int().min(0),
  modelKey: z.string(),
});
export type LessonLabSummary = z.infer<typeof lessonLabSummarySchema>;

/** Compact lesson shape returned in list endpoints (no body, no assets). */
export const lessonListItemSchema = z.object({
  id: z.string().cuid(),
  learningPathId: z.string().cuid(),
  title: z.string(),
  slug: z.string(),
  estimatedMinutes: z.number().int().min(0),
  orderIndex: z.number().int().min(0),
  videoUrl: z.string().nullable(),
  /** Id of the (at most one) primary quiz for this lesson, or null. */
  quizId: z.string().cuid().nullable(),
});
export type LessonListItem = z.infer<typeof lessonListItemSchema>;

/** Full lesson shape returned by GET /lessons/:id. */
export const lessonSchema = z.object({
  id: z.string().cuid(),
  learningPathId: z.string().cuid(),
  title: z.string(),
  slug: z.string(),
  body: z.string().nullable().optional(),
  videoUrl: z.string().nullable(),
  estimatedMinutes: z.number().int().min(0),
  orderIndex: z.number().int().min(0),
  kind: z.nativeEnum(LessonKind),
  /** Id of the primary quiz for this lesson, or null when none exists. */
  quizId: z.string().cuid().nullable(),
  sceneAssets: z.record(z.string()).optional(),
  imageAssets: z.array(lessonImageAssetSchema).optional(),
  lab: lessonLabSummarySchema.nullable().optional(),
});
export type Lesson = z.infer<typeof lessonSchema>;

// ---------------------------------------------------------------------------
// GET /progress/me — per-assigned-path aggregate. The flat lesson list has
// moved to GET /progress/lessons (consumed by the lesson detail UI); this
// shape is what the `/learn` hub renders.
// ---------------------------------------------------------------------------
export const myPathProgressSchema = z.object({
  pathId: z.string().cuid(),
  pathSlug: z.string(),
  pathTitle: z.string(),
  lessonsTotal: z.number().int().min(0),
  lessonsCompleted: z.number().int().min(0),
  /** 0–100 integer. */
  percentComplete: z.number().int().min(0).max(100),
  lastActivityAt: z.string(),
  currentLessonId: z.string().cuid().nullable(),
  assignedAt: z.string(),
});
export type MyPathProgress = z.infer<typeof myPathProgressSchema>;

export const myProgressResponseSchema = z.array(myPathProgressSchema);
export type MyProgressResponse = z.infer<typeof myProgressResponseSchema>;
