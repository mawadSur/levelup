import { apiGet } from './client';
import { reportFiltersSchema, type ReportFilters } from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface CompletionReport {
  totalUsers: number;
  completedUsers: number;
  completionRate: number;
  averageScore: number;
  byDepartment: {
    departmentId: string;
    name: string;
    completionRate: number;
    memberCount: number;
  }[];
  byPath: {
    learningPathId: string;
    title: string;
    completionRate: number;
    assignedCount: number;
  }[];
}

export interface DeptHeatmapCell {
  departmentId: string;
  departmentName: string;
  learningPathId: string;
  pathTitle: string;
  completionRate: number;
  averageScore: number;
  memberCount: number;
}

export interface RiskFlag {
  userId: string;
  userName: string;
  email: string;
  departmentId: string | null;
  flagType: string;
  severity: 'low' | 'medium' | 'high';
  detail: string;
  flaggedAt: string;
}

// ---------------------------------------------------------------------------
// Internal helper: serialize ReportFilters for query string
// ---------------------------------------------------------------------------
function filtersToParams(
  filters?: Partial<ReportFilters>,
): Record<string, string | number | boolean | undefined | null> {
  if (!filters) return {};
  const parsed = reportFiltersSchema.partial().parse(filters);
  const out: Record<string, string | number | boolean | undefined | null> = {};
  if (parsed.departmentId) out['departmentId'] = parsed.departmentId;
  if (parsed.role) out['role'] = parsed.role;
  if (parsed.level) out['level'] = parsed.level;
  if (parsed.startDate) out['startDate'] = parsed.startDate.toISOString();
  if (parsed.endDate) out['endDate'] = parsed.endDate.toISOString();
  if (parsed.format) out['format'] = parsed.format;
  return out;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getCompletionReport(
  filters?: Partial<ReportFilters>,
): Promise<CompletionReport> {
  return apiGet<CompletionReport>('/reports/completion', {
    params: filtersToParams(filters),
  });
}

export async function getDeptHeatmap(filters?: Partial<ReportFilters>): Promise<DeptHeatmapCell[]> {
  return apiGet<DeptHeatmapCell[]>('/reports/heatmap', {
    params: filtersToParams(filters),
  });
}

export async function getRiskFlags(filters?: Partial<ReportFilters>): Promise<RiskFlag[]> {
  return apiGet<RiskFlag[]>('/reports/risk-flags', {
    params: filtersToParams(filters),
  });
}

export async function exportCsv(filters?: Partial<ReportFilters>): Promise<Blob> {
  const params = filtersToParams({ ...filters, format: 'csv' });
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ??
    (typeof window !== 'undefined' ? '' : 'http://localhost:4000');
  const url = `${apiBase}/api/reports/export?${qs.toString()}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}
