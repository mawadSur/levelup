import { apiGet, apiPost } from './client';

// ---------------------------------------------------------------------------
// Types — mirror the API IncidentDto / IncidentDetail shape.
// ---------------------------------------------------------------------------

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'REMEDIATED' | 'DISMISSED' | 'SUGGESTED';
export type IncidentKind =
  | 'SENSITIVE_DATA_LEAK'
  | 'POLICY_VIOLATION'
  | 'AD_RULE_VIOLATION'
  | 'AI_HALLUCINATION_REPORTED'
  | 'OTHER';

export interface IncidentDto {
  id: string;
  organizationId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  kind: IncidentKind;
  severity: IncidentSeverity;
  status: IncidentStatus;
  triggeredBy: string;
  signal: unknown;
  assignedRemediationLabId: string | null;
  assignedRemediationLabSlug: string | null;
  assignedRemediationLabTitle: string | null;
  slaDueAt: string | null;
  openedAt: string;
  resolvedAt: string | null;
}

export interface IncidentHistoryEntry {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface IncidentDetail extends IncidentDto {
  history: IncidentHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export interface ListIncidentsParams {
  severity?: IncidentSeverity[];
  status?: IncidentStatus[];
  includeResolvedSinceDays?: number;
  limit?: number;
}

export async function listIncidents(
  params?: ListIncidentsParams,
): Promise<{ items: IncidentDto[] }> {
  const queryParams: Record<string, string | number | boolean | undefined | null> = {};
  if (params?.severity && params.severity.length > 0) {
    queryParams.severity = params.severity.join(',');
  }
  if (params?.status && params.status.length > 0) {
    queryParams.status = params.status.join(',');
  }
  if (params?.includeResolvedSinceDays !== undefined) {
    queryParams.includeResolvedSinceDays = params.includeResolvedSinceDays;
  }
  if (params?.limit !== undefined) queryParams.limit = params.limit;

  // The API accepts repeated query params or a single CSV string — Zod's
  // union accepts either. We send CSV for compactness.
  return apiGet<{ items: IncidentDto[] }>('/incidents', { params: queryParams });
}

export async function getIncident(id: string): Promise<IncidentDetail> {
  return apiGet<IncidentDetail>(`/incidents/${id}`);
}

export async function acknowledgeIncident(id: string): Promise<IncidentDto> {
  return apiPost<Record<never, never>, IncidentDto>(`/incidents/${id}/acknowledge`, {});
}

export async function promoteIncident(id: string): Promise<IncidentDto> {
  return apiPost<Record<never, never>, IncidentDto>(`/incidents/${id}/promote`, {});
}

export async function dismissIncident(id: string, reason: string): Promise<IncidentDto> {
  return apiPost<{ reason: string }, IncidentDto>(`/incidents/${id}/dismiss`, { reason });
}

export async function remediatedIncident(id: string): Promise<IncidentDto> {
  return apiPost<Record<never, never>, IncidentDto>(`/incidents/${id}/remediated`, {});
}
