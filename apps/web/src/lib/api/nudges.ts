import { apiGet, apiPost } from './client';
import type { CoachNudgeDto, ListCoachNudgesResponse } from '@levelup/types';

export type CoachNudge = CoachNudgeDto;

/**
 * GET /api/nudges/me — up to 3 active (not dismissed, < 7d old) nudges for
 * the current user. Server reads `LEVELUP_SESSION`; no body required.
 */
export async function listMyActive(opts?: { signal?: AbortSignal }): Promise<CoachNudge[]> {
  const res = await apiGet<ListCoachNudgesResponse>('/nudges/me', {
    ...(opts?.signal ? { signal: opts.signal } : {}),
  });
  return res.items;
}

export async function dismissNudge(id: string): Promise<{ id: string; dismissedAt: string }> {
  return apiPost<Record<string, never>, { id: string; dismissedAt: string }>(
    `/nudges/${id}/dismiss`,
    {},
  );
}

export async function markNudgeActedOn(id: string): Promise<{ id: string; actedOnAt: string }> {
  return apiPost<Record<string, never>, { id: string; actedOnAt: string }>(
    `/nudges/${id}/acted-on`,
    {},
  );
}
