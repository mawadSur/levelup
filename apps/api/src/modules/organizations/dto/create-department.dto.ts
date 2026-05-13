import { createDepartmentSchema } from '@levelup/types';
import { z } from 'zod';

export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
export { createDepartmentSchema };
