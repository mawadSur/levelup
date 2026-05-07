import { apiGet, apiPost } from './client';
import type {
  AnomalyAlertDto,
  ListAnomaliesQuery,
  ListAnomaliesResponse,
  AnomalyKindValue,
  AnomalySeverityValue,
} from '@levelup/types';

// Re-export for convenience at call sites
export type { AnomalyAlertDto, ListAnomaliesResponse, AnomalyKindValue, AnomalySeverityValue };

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function listAlerts(
  params?: Partial<
    Pick<ListAnomaliesQuery, 'severity' | 'kind' | 'since' | 'cursor' | 'limit'> & {
      unacknowledged: boolean;
    }
  >,
): Promise<ListAnomaliesResponse> {
  const queryParams: Record<string, string | number | boolean | undefined | null> = {};
  if (params?.severity) queryParams.severity = params.severity;
  if (params?.kind) queryParams.kind = params.kind;
  if (params?.since) queryParams.since = params.since;
  if (params?.unacknowledged !== undefined)
    queryParams.unacknowledged = String(params.unacknowledged);
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.limit) queryParams.limit = params.limit;

  return apiGet<ListAnomaliesResponse>('/anomalies', { params: queryParams });
}

export async function countUnacknowledged(): Promise<number> {
  return apiGet<number>('/anomalies/unack-count');
}

export async function acknowledgeAlert(id: string): Promise<AnomalyAlertDto> {
  return apiPost<Record<never, never>, AnomalyAlertDto>(`/anomalies/${id}/acknowledge`, {});
}
