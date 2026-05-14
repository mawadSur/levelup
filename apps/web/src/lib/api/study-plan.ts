import { apiGet, apiPost } from './client';
import type {
  CurrentWeekResponse,
  GenerateStudyPlanResponse,
  TeamStudyPlanResponse,
  UpcomingPlansResponse,
} from '@levelup/types';

export type {
  CurrentWeekResponse,
  GenerateStudyPlanResponse,
  StudyPlanItem,
  StudyPlanItemStatus,
  StudyPlanLessonItem,
  StudyPlanLabItem,
  StudyPlanWeek,
  TeamStudyPlanResponse,
  TeamStudyPlanRow,
  UpcomingPlansResponse,
} from '@levelup/types';

export async function getCurrentWeek(): Promise<CurrentWeekResponse> {
  return apiGet<CurrentWeekResponse>('/study-plan/me/current-week');
}

export async function getUpcoming(): Promise<UpcomingPlansResponse> {
  return apiGet<UpcomingPlansResponse>('/study-plan/me/upcoming');
}

export async function generate(opts: { force?: boolean } = {}): Promise<GenerateStudyPlanResponse> {
  return apiPost<{ force?: boolean }, GenerateStudyPlanResponse>('/study-plan/me/generate', {
    force: opts.force ?? false,
  });
}

export async function getTeam(): Promise<TeamStudyPlanResponse> {
  return apiGet<TeamStudyPlanResponse>('/admin/study-plan/team');
}

// Used by /assessment "Skip for now" — calls the assessments API. Lives here
// to keep all StudyPlan-adjacent web client functions together.
export async function skipAssessment(): Promise<{ aiLevel: string; planSeeded: boolean }> {
  return apiPost<Record<string, never>, { aiLevel: string; planSeeded: boolean }>(
    '/assessments/skip',
    {},
  );
}
