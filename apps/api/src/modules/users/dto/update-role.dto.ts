import { z } from 'zod';
import { Role } from '@levelup/db';

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
