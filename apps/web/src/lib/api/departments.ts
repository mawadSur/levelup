import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { createDepartmentSchema, type CreateDepartmentInput } from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface Department {
  id: string;
  name: string;
  organizationId: string;
  memberCount: number;
  createdAt: string;
}

export interface UpdateDeptInput {
  name: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function listDepts(): Promise<Department[]> {
  return apiGet<Department[]>('/departments');
}

export async function createDept(input: CreateDepartmentInput): Promise<Department> {
  const parsed = createDepartmentSchema.parse(input);
  return apiPost<CreateDepartmentInput, Department>('/departments', parsed);
}

export async function updateDept(id: string, input: UpdateDeptInput): Promise<Department> {
  return apiPatch<UpdateDeptInput, Department>(`/departments/${id}`, input);
}

export async function deleteDept(id: string): Promise<void> {
  return apiDelete(`/departments/${id}`);
}
