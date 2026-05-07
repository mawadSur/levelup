import { z } from 'zod';

export const issueCertificateSchema = z.object({
  userId: z.string().cuid(),
  learningPathId: z.string().cuid(),
});

export type IssueCertificateDto = z.infer<typeof issueCertificateSchema>;
