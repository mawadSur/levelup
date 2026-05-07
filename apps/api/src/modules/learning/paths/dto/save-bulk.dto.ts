import { z } from 'zod';
import { AiLevel, Role } from '@levelup/db';

export const saveBulkQuizQuestionSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(10),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional().nullable(),
  orderIndex: z.number().int().min(0),
});

export const saveBulkQuizSchema = z.object({
  /** Existing quiz id — if provided the quiz is updated; otherwise a new quiz is created. */
  id: z.string().cuid().optional(),
  title: z.string().min(1).max(200),
  questions: z.array(saveBulkQuizQuestionSchema).min(1).max(50),
});

export const saveBulkLessonSchema = z.object({
  /** Existing lesson id — present when editing, absent when adding new. */
  id: z.string().cuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
  title: z.string().min(2).max(200),
  body: z.string().min(1),
  estimatedMinutes: z.number().int().min(1).max(600),
  orderIndex: z.number().int().min(0),
  quiz: saveBulkQuizSchema.optional(),
});

export const saveBulkSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  targetRole: z.nativeEnum(Role).nullable().optional(),
  targetLevel: z.nativeEnum(AiLevel).optional(),
  isPublished: z.boolean().optional(),
  lessons: z.array(saveBulkLessonSchema).max(100),
});

export type SaveBulkDto = z.infer<typeof saveBulkSchema>;
export type SaveBulkLessonDto = z.infer<typeof saveBulkLessonSchema>;
export type SaveBulkQuizDto = z.infer<typeof saveBulkQuizSchema>;
