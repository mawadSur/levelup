import { createLearningPathSchema } from '@levelup/types';
import { z } from 'zod';

export { createLearningPathSchema };
export type CreatePathDto = z.infer<typeof createLearningPathSchema>;
