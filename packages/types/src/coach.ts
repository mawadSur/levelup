import { z } from 'zod';

export const coachRequestSchema = z.object({
  inputText: z.string().min(1).max(8000),
  category: z.string().max(60).optional(),
  conversationId: z.string().cuid().optional(),
});
export type CoachRequest = z.infer<typeof coachRequestSchema>;

export const coachResponseSchema = z.object({
  sessionId: z.string().cuid(),
  aiResponse: z.string(),
  modelUsed: z.string(),
  tokensUsed: z.number().int().nonnegative(),
  sensitiveDataDetected: z.boolean(),
  warnings: z.array(z.string()).default([]),
});
export type CoachResponse = z.infer<typeof coachResponseSchema>;

export const savePromptSchema = z.object({
  title: z.string().min(2).max(120),
  promptText: z.string().min(1).max(8000),
  category: z.string().min(1).max(60),
  isShared: z.boolean().default(false),
  /** When set, scopes a shared prompt to a specific department (dept-shared). */
  departmentId: z.string().nullable().optional(),
});
export type SavePromptInput = z.infer<typeof savePromptSchema>;

// ---------------------------------------------------------------------------
// Multi-turn conversation schemas
// ---------------------------------------------------------------------------

/**
 * Lightweight summary of a conversation, used for sidebar/history listings.
 * `lastTurnPreview` is a 60-char preview of the most recent USER turn so the
 * client can render a useful label without fetching the full thread.
 */
export const conversationSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  lastTurnPreview: z.string(),
  turnCount: z.number().int(),
  updatedAt: z.string(),
});
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const conversationTurnSchema = z.object({
  id: z.string(),
  role: z.enum(['USER', 'ASSISTANT']),
  content: z.string(),
  sensitiveDataDetected: z.boolean(),
  createdAt: z.string(),
});
export type ConversationTurnDto = z.infer<typeof conversationTurnSchema>;

/**
 * Full conversation thread — used by the chat surface when a `?c=<id>` query
 * param is present. The `turns` array is ordered ascending by `createdAt` so
 * the client can render messages in chronological order.
 */
export const conversationDetailSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  turns: z.array(conversationTurnSchema),
});
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;
