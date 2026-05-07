import { z } from 'zod';

/**
 * The canonical submitQuizAttemptSchema from @levelup/types includes `quizId`
 * because it is also used for direct API calls. For the REST endpoint here,
 * quizId comes from the URL param, so we validate only the body fields.
 */
export const submitAttemptBodySchema = z.object({
  answers: z.array(z.number().int().min(0)).min(1).max(50),
});

export type SubmitAttemptDto = z.infer<typeof submitAttemptBodySchema>;
