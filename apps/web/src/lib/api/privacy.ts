import { apiGet, apiPost } from './client';
import type { DataExportRequestDto, DeletionRequestDto } from '@levelup/types';

// ---------------------------------------------------------------------------
// Data Export
// ---------------------------------------------------------------------------

export async function requestExport(): Promise<DataExportRequestDto> {
  return apiPost<Record<string, never>, DataExportRequestDto>('/privacy/exports', {});
}

export async function listExports(): Promise<DataExportRequestDto[]> {
  return apiGet<DataExportRequestDto[]>('/privacy/exports');
}

export async function getExport(id: string): Promise<DataExportRequestDto> {
  return apiGet<DataExportRequestDto>(`/privacy/exports/${id}`);
}

// ---------------------------------------------------------------------------
// Deletion
// ---------------------------------------------------------------------------

export async function requestDeletion(opts?: { reason?: string }): Promise<DeletionRequestDto> {
  return apiPost<{ reason?: string }, DeletionRequestDto>('/privacy/deletions', {
    reason: opts?.reason,
  });
}

export async function listDeletions(): Promise<DeletionRequestDto[]> {
  return apiGet<DeletionRequestDto[]>('/privacy/deletions');
}

export async function cancelDeletion(id: string): Promise<DeletionRequestDto> {
  return apiPost<Record<string, never>, DeletionRequestDto>(`/privacy/deletions/${id}/cancel`, {});
}

export async function confirmDeletion(id: string): Promise<DeletionRequestDto> {
  return apiPost<Record<string, never>, DeletionRequestDto>(`/privacy/deletions/${id}/confirm`, {});
}
