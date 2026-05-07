import { z } from 'zod';

export const assignPathSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(500),
});

export type AssignPathDto = z.infer<typeof assignPathSchema>;
