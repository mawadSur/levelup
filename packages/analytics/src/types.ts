export interface AnalyticsIdentity {
  userId: string;
  organizationId: string;
  role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  aiLevel?: 'BEGINNER' | 'PRACTITIONER' | 'POWER_USER' | 'CHAMPION';
  email?: string;
  departmentId?: string;
}

export interface AnalyticsOrgIdentity {
  organizationId: string;
  name: string;
  plan?: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
}

export type EventName =
  | 'auth_signed_in'
  | 'lesson_started'
  | 'lesson_completed'
  | 'path_completed'
  | 'quiz_attempted'
  | 'assessment_started'
  | 'assessment_submitted'
  | 'coach_invoked'
  | 'coach_sensitive_data_detected'
  | 'coach_prompt_fixed'
  | 'coach_nudge.generated'
  | 'coach_nudge.shown'
  | 'coach_nudge.dismissed'
  | 'coach_nudge.acted_on'
  | 'prompt_saved'
  | 'prompt_cloned'
  | 'prompt_shared'
  | 'badge_earned'
  | 'level_up'
  | 'streak_milestone'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'checkout_started'
  | 'subscription_changed'
  | 'integration_installed'
  | 'integration_revoked'
  | 'feature_flag_toggled'
  | 'pricing_variant_exposed';

export interface BaseEventProps {
  organizationId: string;
  userId?: string;
}

export type EventProps<E extends EventName> = E extends 'lesson_completed'
  ? BaseEventProps & { lessonId: string; pathId: string; firstTime: boolean }
  : E extends 'path_completed'
    ? BaseEventProps & { pathId: string; totalLessons: number }
    : E extends 'quiz_attempted'
      ? BaseEventProps & {
          quizId: string;
          passed: boolean;
          score: number;
          attemptNumber: number;
        }
      : E extends 'coach_invoked'
        ? BaseEventProps & {
            sensitiveDataDetected: boolean;
            tokensUsed: number;
            modelUsed: string;
          }
        : E extends 'coach_nudge.generated'
          ? BaseEventProps & {
              nudgeId: string;
              kind: string;
              templateProvided: boolean;
            }
          : E extends 'coach_nudge.shown' | 'coach_nudge.dismissed' | 'coach_nudge.acted_on'
            ? BaseEventProps & { nudgeId: string; kind: string }
            : E extends 'prompt_saved'
              ? BaseEventProps & {
                  promptId: string;
                  category: string;
                  isShared: boolean;
                  departmentId: string | null;
                }
              : E extends 'prompt_cloned'
                ? BaseEventProps & {
                    originalPromptId: string;
                    cloningUserId: string;
                  }
                : E extends 'checkout_started'
                  ? BaseEventProps & { plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE' }
                  : E extends 'assessment_submitted'
                    ? BaseEventProps & {
                        assessmentId: string;
                        type: string;
                        score: number;
                        total: number;
                        recommendedLevel: string;
                      }
                    : E extends 'pricing_variant_exposed'
                      ? BaseEventProps & {
                          flagKey: string;
                          variant: 'A' | 'B';
                          anonId: string;
                        }
                      : BaseEventProps & Record<string, unknown>;
