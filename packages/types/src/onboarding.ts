import { z } from 'zod';

// ---------------------------------------------------------------------------
// Onboarding state
// ---------------------------------------------------------------------------

export const onboardingStateSchema = z.object({
  currentStep: z.number().int().min(0),
  completedSteps: z.array(z.number().int()),
  isDismissed: z.boolean(),
  isComplete: z.boolean(),
});

export type OnboardingState = z.infer<typeof onboardingStateSchema>;

// ---------------------------------------------------------------------------
// Advance step input
// ---------------------------------------------------------------------------

export const advanceStepSchema = z.object({
  step: z.number().int().min(0).max(10),
});

export type AdvanceStepInput = z.infer<typeof advanceStepSchema>;
