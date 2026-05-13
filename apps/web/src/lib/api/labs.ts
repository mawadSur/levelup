import { apiGet, apiPost } from './client';
import type {
  LabAttemptRequest,
  LabAttemptResponse,
  LabAttemptSummary,
  LabDetail,
  LabRunRequest,
  LabRunResponse,
  LabSummary,
} from '@levelup/types';

export type {
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
