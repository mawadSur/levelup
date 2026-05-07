import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  jobTitle: z.string().max(120).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
