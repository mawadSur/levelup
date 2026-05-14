import { apiGet, apiPost } from './client';
import type {
  LabAttemptHistoryItem,
  LabAttemptRequest,
  LabAttemptResponse,
  LabAttemptSummary,
  LabDetail,
  LabRunRequest,
  LabRunResponse,
  LabSummary,
  StuckLearner,
} from '@levelup/types';

export type {
  LabAttemptHistoryItem,
  LabAttemptRequest,
  LabAttemptResponse,
  LabAttemptSummary,
  LabCriterionResult,
  LabDetail,
  LabRunRequest,
  LabRunResponse,
  LabSummary,
  LabTranscript,
  LabTranscriptTurn,
  StuckLearner,
} from '@levelup/types';

export function listLabs(): Promise<LabSummary[]> {
  return apiGet<LabSummary[]>('/labs');
}

export function getLab(slug: string): Promise<LabDetail> {
  return apiGet<LabDetail>(`/labs/${encodeURIComponent(slug)}`);
}

export function runLabTurn(slug: string, body: LabRunRequest): Promise<LabRunResponse> {
  return apiPost<LabRunRequest, LabRunResponse>(`/labs/${encodeURIComponent(slug)}/runs`, body);
}

export function submitLabAttempt(
  slug: string,
  body: LabAttemptRequest,
): Promise<LabAttemptResponse> {
  return apiPost<LabAttemptRequest, LabAttemptResponse>(
    `/labs/${encodeURIComponent(slug)}/attempts`,
    body,
  );
}

export function listMyLabAttempts(slug?: string): Promise<LabAttemptSummary[]> {
  return apiGet<LabAttemptSummary[]>('/labs/me/attempts', {
    params: slug ? { slug } : {},
  });
}

export function listMyAttempts(slug: string): Promise<LabAttemptHistoryItem[]> {
  return apiGet<LabAttemptHistoryItem[]>(`/labs/${encodeURIComponent(slug)}/me/attempts`);
}

export function listStuckLearners(slug: string): Promise<StuckLearner[]> {
  return apiGet<StuckLearner[]>(`/admin/labs/${encodeURIComponent(slug)}/stuck-learners`);
}
