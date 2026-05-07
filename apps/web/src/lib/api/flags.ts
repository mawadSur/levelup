import { apiGet, apiPost, apiDelete } from './client';
import type { EvaluatedFlag, UpsertFlagInput } from '@levelup/types';

export async function getMyFlags(): Promise<Record<string, boolean>> {
  return apiGet<Record<string, boolean>>('/flags/me');
}

export async function listFlags(): Promise<EvaluatedFlag[]> {
  return apiGet<EvaluatedFlag[]>('/flags');
}

export async function upsertFlag(input: UpsertFlagInput): Promise<EvaluatedFlag> {
  return apiPost<UpsertFlagInput, EvaluatedFlag>('/flags', input);
}

export async function deleteFlag(key: string): Promise<void> {
  return apiDelete<void>(`/flags/${encodeURIComponent(key)}`);
}
