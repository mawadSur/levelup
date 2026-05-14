import { z } from 'zod';

// A single chat turn the learner accumulates client-side, then ships back to
// the API on each run/attempt request. The `ts` is the client-stamped wall
// clock for display only — the server never trusts it for ordering.
export const labTranscriptTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
  ts: z.number().int().nonnegative().optional(),
});
export type LabTranscriptTurn = z.infer<typeof labTranscriptTurnSchema>;

export const labTranscriptSchema = z.array(labTranscriptTurnSchema).max(40);
export type LabTranscript = z.infer<typeof labTranscriptSchema>;

// Per-criterion grader rubric. `graderPrompt` is the system prompt the grader
// LLM uses to judge JUST that criterion against the full transcript.
export const labRubricCriterionSchema = z.object({
  id: z.string().min(1).max(64),
  weight: z.number().positive().max(10),
  graderPrompt: z.string().min(1).max(4000),
});
export type LabRubricCriterion = z.infer<typeof labRubricCriterionSchema>;

export const labRubricSchema = z.object({
  passThreshold: z.number().min(0).max(1).default(0.7),
  criteria: z.array(labRubricCriterionSchema).min(1).max(10),
});
export type LabRubric = z.infer<typeof labRubricSchema>;

// Seeded context is intentionally an open JSON object — labs vary widely
// (fake support tickets, redacted-on-arrival docs, policy excerpts). The
// shape is owned by each lab's content file.
export const labSeededContextSchema = z.record(z.string(), z.unknown());
export type LabSeededContext = z.infer<typeof labSeededContextSchema>;

// ---------------------------------------------------------------------------
// Public API shapes
// ---------------------------------------------------------------------------

export const labSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  brief: z.string(),
  estimatedMinutes: z.number().int().min(1),
  learningPathId: z.string().nullable(),
  isGlobal: z.boolean(),
});
export type LabSummary = z.infer<typeof labSummarySchema>;

// What `GET /labs/:slug` returns. Deliberately strips `systemPrompt` and
// `rubric` from the wire payload — the learner must not be able to read the
// grading criteria or the simulated chatbot's hidden instructions.
export const labDetailSchema = labSummarySchema.extend({
  seededContext: labSeededContextSchema,
});
export type LabDetail = z.infer<typeof labDetailSchema>;

export const labRunRequestSchema = z.object({
  transcript: labTranscriptSchema,
  userInput: z.string().min(1).max(4000),
});
export type LabRunRequest = z.infer<typeof labRunRequestSchema>;

export const labRunResponseSchema = z.object({
  assistantReply: z.string(),
  model: z.string(),
  stub: z.boolean(),
});
export type LabRunResponse = z.infer<typeof labRunResponseSchema>;

export const labAttemptRequestSchema = z.object({
  transcript: labTranscriptSchema.min(1),
});
export type LabAttemptRequest = z.infer<typeof labAttemptRequestSchema>;

export const labCriterionResultSchema = z.object({
  id: z.string(),
  weight: z.number(),
  pass: z.boolean(),
  score: z.number().min(0).max(1),
  note: z.string(),
});
export type LabCriterionResult = z.infer<typeof labCriterionResultSchema>;

export const labAttemptResponseSchema = z.object({
  attemptId: z.string(),
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  criteria: z.array(labCriterionResultSchema),
  xpAwarded: z.number().int().min(0),
});
export type LabAttemptResponse = z.infer<typeof labAttemptResponseSchema>;

export const labAttemptSummarySchema = z.object({
  id: z.string(),
  labId: z.string(),
  labSlug: z.string(),
  labTitle: z.string(),
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  createdAt: z.string(),
});
export type LabAttemptSummary = z.infer<typeof labAttemptSummarySchema>;

export const labAttemptHistoryItemSchema = z.object({
  id: z.string(),
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  criteria: z.array(labCriterionResultSchema),
  tokensUsed: z.number().int().min(0),
  createdAt: z.string(),
});
export type LabAttemptHistoryItem = z.infer<typeof labAttemptHistoryItemSchema>;

export const stuckLearnerSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  attemptCount: z.number().int().min(0),
  latestScore: z.number().min(0).max(1),
  latestAt: z.string(),
  weakestCriteria: z.array(z.string()),
});
export type StuckLearner = z.infer<typeof stuckLearnerSchema>;

// ---------------------------------------------------------------------------
// Admin-side spec — what an admin POSTs to create a lab. Mirrors the JSON
// content files under packages/db/content/labs/<slug>.lab.json so we have
// exactly one schema for both seed-time loading and runtime CRUD.
// ---------------------------------------------------------------------------

export const labSpecSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(96)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1).max(160),
  brief: z.string().min(1).max(4000),
  systemPrompt: z.string().min(1).max(8000),
  seededContext: labSeededContextSchema,
  rubric: labRubricSchema,
  estimatedMinutes: z.number().int().min(1).max(120),
  learningPathId: z.string().nullable().optional(),
  isPublished: z.boolean().optional().default(true),
});
export type LabSpec = z.infer<typeof labSpecSchema>;

export const labUpdateSpecSchema = labSpecSchema.partial();
export type LabUpdateSpec = z.infer<typeof labUpdateSpecSchema>;
