import { z } from 'zod';

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  industry: z.string().max(80).optional(),
  companySize: z.string().max(40).optional(),
});

export type UpdateOrgDto = z.infer<typeof updateOrgSchema>;
