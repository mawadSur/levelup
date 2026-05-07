import { z } from 'zod';
import { AiLevel, Role } from '@levelup/db';

export const updatePathSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  targetRole: z.nativeEnum(Role).nullable().optional(),
  targetLevel: z.nativeEnum(AiLevel).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  isPublished: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export type UpdatePathDto = z.infer<typeof updatePathSchema>;
