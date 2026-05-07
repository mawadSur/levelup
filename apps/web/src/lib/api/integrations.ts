import { apiGet, apiDelete } from './client';
import type { IntegrationSummary } from '@levelup/types';

export async function list(): Promise<IntegrationSummary[]> {
  return apiGet<IntegrationSummary[]>('/integrations');
}

export async function remove(provider: 'SLACK' | 'MS_TEAMS'): Promise<{ ok: true }> {
  return apiDelete<{ ok: true }>(`/integrations/${provider}`);
}
