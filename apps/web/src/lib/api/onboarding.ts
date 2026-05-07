import { apiGet, apiPost } from './client';
import type { OnboardingState } from '@levelup/types';

export async function getOnboardingState(): Promise<OnboardingState> {
  return apiGet<OnboardingState>('/onboarding/state');
}

export async function advanceOnboarding(step: number): Promise<OnboardingState> {
  return apiPost<{ step: number }, OnboardingState>('/onboarding/advance', { step });
}

export async function dismissOnboarding(): Promise<OnboardingState> {
  return apiPost<Record<string, never>, OnboardingState>('/onboarding/dismiss', {});
}

export async function restartOnboarding(): Promise<OnboardingState> {
  return apiPost<Record<string, never>, OnboardingState>('/onboarding/restart', {});
}
