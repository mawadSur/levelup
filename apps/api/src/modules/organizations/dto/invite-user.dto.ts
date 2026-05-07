import { inviteUserSchema } from '@levelup/types';
import type { z } from 'zod';

export type InviteUserDto = z.infer<typeof inviteUserSchema>;
export { inviteUserSchema };
