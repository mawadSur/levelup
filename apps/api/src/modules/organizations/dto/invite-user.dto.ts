import { inviteUserSchema } from '@levelup/types';
import { z } from 'zod';

export type InviteUserDto = z.infer<typeof inviteUserSchema>;
export { inviteUserSchema };
