import { updateLessonProgressSchema } from '@levelup/types';
import { z } from 'zod';

export { updateLessonProgressSchema };
export type UpdateProgressDto = z.infer<typeof updateLessonProgressSchema>;
