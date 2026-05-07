import { updateLessonProgressSchema } from '@levelup/types';
import type { z } from 'zod';

export { updateLessonProgressSchema };
export type UpdateProgressDto = z.infer<typeof updateLessonProgressSchema>;
