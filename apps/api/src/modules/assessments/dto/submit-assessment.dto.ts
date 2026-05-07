/**
 * submit-assessment.dto.ts
 *
 * Extends the shared `submitAssessmentSchema` from @levelup/types with the
 * `assessmentSessionId` fingerprint that must round-trip from /start → /submit
 * so the server can validate the submitted item set was not cherry-picked.
 */
import { z } from 'zod';
import { submitAssessmentSchema } from '@levelup/types';

export const submitAssessmentDtoSchema = submitAssessmentSchema.extend({
  assessmentSessionId: z.string().min(1),
});

export type SubmitAssessmentDto = z.infer<typeof submitAssessmentDtoSchema>;
