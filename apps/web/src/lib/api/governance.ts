import { apiGet, apiPost } from './client';

// ---------------------------------------------------------------------------
// Response types — kept local (mirrors GovernanceService surface in the API).
// We don't import from `@levelup/types` here because the governance module
// chose to keep its DTOs local; following that boundary so we never depend on
// a not-yet-exported type at the package boundary.
// ---------------------------------------------------------------------------

export interface PostureResponse {
  totalAiInteractions: number;
  sensitiveDataTriggers: number;
  highRiskUsers: number;
  policyCoveragePct: number;
  windowDays: number;
}

export interface DeptRiskRow {
  departmentId: string | null;
  departmentName: string;
  headcount: number;
  coachDau30: number;
  sensitiveTriggers: number;
  policyCompletionPct: number;
  riskScore: number;
  trend: 'up' | 'down' | 'flat';
}

export interface RiskByDeptResponse {
  rows: DeptRiskRow[];
  windowDays: number;
}

export interface TriggerFeedItem {
  id: string;
  occurredAt: string;
  userMask: string;
  departmentName: string | null;
  category: string;
  trained: boolean;
  promptPreview: string;
  policySection: string | null;
  suggestedLesson: { lessonId: string; lessonTitle: string; pathId: string } | null;
}

export interface TriggerFeedResponse {
  items: TriggerFeedItem[];
}

export type ReportStatus = 'queued' | 'generating' | 'ready' | 'failed';

export interface ReportRequestResponse {
  requestId: string;
}

export interface ReportStatusResponse {
  requestId: string;
  status: ReportStatus;
  signedUrl: string | null;
  error: string | null;
  createdAt: string | null;
  completedAt: string | null;
}

export interface GenerateReportInput {
  periodLabel?: string;
  windowDays?: number;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getPosture(): Promise<PostureResponse> {
  return apiGet<PostureResponse>('/governance/posture');
}

export async function getRiskByDept(): Promise<RiskByDeptResponse> {
  return apiGet<RiskByDeptResponse>('/governance/risk-by-dept');
}

export async function getTriggerFeed(limit = 50): Promise<TriggerFeedResponse> {
  return apiGet<TriggerFeedResponse>('/governance/trigger-feed', { params: { limit } });
}

export async function generateReport(input: GenerateReportInput = {}): Promise<ReportRequestResponse> {
  return apiPost<GenerateReportInput, ReportRequestResponse>('/governance/report', input);
}

export async function getReportStatus(requestId: string): Promise<ReportStatusResponse> {
  return apiGet<ReportStatusResponse>(`/governance/report/${encodeURIComponent(requestId)}`);
}
