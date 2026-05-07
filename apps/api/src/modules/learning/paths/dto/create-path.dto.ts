import { createLearningPathSchema } from '@levelup/types';
import type { z } from 'zod';

export { createLearningPathSchema };
export type CreatePathDto = z.infer<typeof createLearningPathSchema>;
