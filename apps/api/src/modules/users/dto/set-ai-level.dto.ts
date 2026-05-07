import { z } from 'zod';
import { AiLevel } from '@levelup/db';

export const setAiLevelSchema = z.object({
  aiLevel: z.nativeEnum(AiLevel),
});

export type SetAiLevelDto = z.infer<typeof setAiLevelSchema>;
