import { captureEvent } from './server';
import type { BaseEventProps } from './types';

/**
 * Type-safe, fire-and-forget event helpers. Each method maps 1:1 to an
 * `EventName` in the taxonomy, enforcing its property shape at the call site
 * so typos or missing fields are caught at compile time.
 *
 * All methods are synchronous from the caller's perspective — the underlying
 * PostHog client batches and flushes asynchronously. Errors are swallowed
 * inside `captureEvent` so none of these helpers can ever throw.
 */
export const track = {
  lessonCompleted: (
    props: BaseEventProps & {
      lessonId: string;
      pathId: string;
      firstTime: boolean;
    },
  ) => captureEvent('lesson_completed', props),

  pathCompleted: (props: BaseEventProps & { pathId: string; totalLessons: number }) =>
    captureEvent('path_completed', props),

  quizAttempted: (
    props: BaseEventProps & {
      quizId: string;
      passed: boolean;
      score: number;
      attemptNumber: number;
    },
  ) => captureEvent('quiz_attempted', props),

  coachInvoked: (
    props: BaseEventProps & {
      sensitiveDataDetected: boolean;
      tokensUsed: number;
      modelUsed: string;
    },
  ) => captureEvent('coach_invoked', props),

  promptSaved: (
    props: BaseEventProps & {
      promptId: string;
      category: string;
      isShared: boolean;
      departmentId: string | null;
    },
  ) => captureEvent('prompt_saved', props),

  promptCloned: (
    props: BaseEventProps & {
      originalPromptId: string;
      cloningUserId: string;
    },
  ) => captureEvent('prompt_cloned', props),

  assessmentSubmitted: (
    props: BaseEventProps & {
      assessmentId: string;
      type: string;
      score: number;
      total: number;
      recommendedLevel: string;
    },
  ) => captureEvent('assessment_submitted', props),

  checkoutStarted: (props: BaseEventProps & { plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE' }) =>
    captureEvent('checkout_started', props),

  authSignedIn: (props: BaseEventProps & Record<string, unknown>) =>
    captureEvent('auth_signed_in', props),
};
