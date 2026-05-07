import { apiGet, apiPost, apiDelete } from './client';
import { updatePolicySchema, type UpdatePolicyInput } from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface ApprovedToolEntry {
  name: string;
  tier: 'approved' | 'caution' | 'banned';
  notes?: string;
}

export interface PolicyVersion {
  id: string;
  organizationId: string;
  version: number;
  policyText: string;
  /** Stored as JSON. May be the flat governance shape or null. */
  approvedTools: ApprovedToolEntry[] | null;
  uploadedFileUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getCurrentPolicy(): Promise<PolicyVersion | null> {
  return apiGet<PolicyVersion | null>('/policies/current');
}

export async function listPolicies(): Promise<PolicyVersion[]> {
  return apiGet<PolicyVersion[]>('/policies');
}

export async function getPolicyVersion(id: string): Promise<PolicyVersion> {
  return apiGet<PolicyVersion>(`/policies/${id}`);
}

export async function publishPolicy(input: UpdatePolicyInput): Promise<PolicyVersion> {
  const parsed = updatePolicySchema.parse(input);
  return apiPost<UpdatePolicyInput, PolicyVersion>('/policies', parsed);
}

export async function deletePolicyVersion(id: string): Promise<void> {
  return apiDelete(`/policies/${id}`);
}
