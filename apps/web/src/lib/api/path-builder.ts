import { apiGet, apiPost } from './client';
import type {
  AcceptPathRequestInput,
  CreatePathRequestInput,
  PathGenerationRequestDto,
} from '@levelup/types';
import type { LearningPath } from './paths';

// ---------------------------------------------------------------------------
// AI path-builder client (CR.33)
// ---------------------------------------------------------------------------

export type PathBuilderRequest = PathGenerationRequestDto;

export async function createRequest(input: CreatePathRequestInput): Promise<PathBuilderRequest> {
  return apiPost<CreatePathRequestInput, PathBuilderRequest>('/path-builder/requests', input);
}

export async function getRequest(id: string): Promise<PathBuilderRequest> {
  return apiGet<PathBuilderRequest>(`/path-builder/requests/${id}`);
}

export async function listRequests(): Promise<PathBuilderRequest[]> {
  return apiGet<PathBuilderRequest[]>('/path-builder/requests');
}

export async function acceptRequest(
  id: string,
  input: AcceptPathRequestInput = {},
): Promise<LearningPath> {
  return apiPost<AcceptPathRequestInput, LearningPath>(
    `/path-builder/requests/${id}/accept`,
    input,
  );
}

export async function cancelRequest(id: string): Promise<PathBuilderRequest> {
  return apiPost<Record<string, never>, PathBuilderRequest>(
    `/path-builder/requests/${id}/cancel`,
    {},
  );
}
