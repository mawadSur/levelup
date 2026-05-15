import { apiGet, apiPatch, apiPost } from './client';
import { createOrganizationSchema, type CreateOrganizationInput } from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  companySize: string | null;
  plan: string;
  seats: number;
  createdAt: string;
}

/**
 * Per-role and per-department entries on the OrgStats payload carry both the
 * member count AND a 0..1 completion rate so the admin dashboard renders
 * without falling back to the heavier CompletionReport endpoint.
 */
export interface OrgStatsRoleEntry {
  count: number;
  /** 0..1 ratio. Multiply by 100 for percent display. */
  completionRate: number;
}

export interface OrgStatsDepartmentEntry {
  departmentId: string;
  name: string;
  count: number;
  /** 0..1 ratio. Multiply by 100 for percent display. */
  completionRate: number;
}

export interface OrgStats {
  totalUsers: number;
  activeUsers: number;
  /** 0..1 ratio. Multiply by 100 for percentage display. */
  completionRate: number;
  byRole: Record<'ADMIN' | 'MANAGER' | 'EMPLOYEE', OrgStatsRoleEntry>;
  byDepartment: OrgStatsDepartmentEntry[];
  riskFlags: number;
}

export interface UpdateOrgInput {
  name?: string;
  industry?: string;
  companySize?: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getMyOrg(): Promise<Organization> {
  return apiGet<Organization>('/organizations/me');
}

export async function updateOrg(input: UpdateOrgInput): Promise<Organization> {
  return apiPatch<UpdateOrgInput, Organization>('/organizations/me', input);
}

export async function getStats(): Promise<OrgStats> {
  return apiGet<OrgStats>('/organizations/me/stats');
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<{ organizationId: string; signInUrl: string }> {
  const parsed = createOrganizationSchema.parse(input);
  return apiPost<CreateOrganizationInput, { organizationId: string; signInUrl: string }>(
    '/organizations',
    parsed,
  );
}
