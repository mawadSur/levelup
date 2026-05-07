import { z } from 'zod';
import { AssessmentType } from '@levelup/db';

export const startAssessmentSchema = z.object({
  type: z.nativeEnum(AssessmentType).optional().default(AssessmentType.BASELINE),
});

export type StartAssessmentDto = z.infer<typeof startAssessmentSchema>;
