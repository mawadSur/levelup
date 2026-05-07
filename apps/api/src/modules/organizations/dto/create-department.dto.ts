import { createDepartmentSchema } from '@levelup/types';
import type { z } from 'zod';

export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
export { createDepartmentSchema };
