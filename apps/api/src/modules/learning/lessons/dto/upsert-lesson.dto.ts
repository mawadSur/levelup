import { z } from 'zod';

export const upsertLessonSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
  body: z.string().min(1),
  videoUrl: z.string().url().optional().nullable(),
  estimatedMinutes: z.number().int().min(1).max(600),
  orderIndex: z.number().int().min(0),
});

export type UpsertLessonDto = z.infer<typeof upsertLessonSchema>;
