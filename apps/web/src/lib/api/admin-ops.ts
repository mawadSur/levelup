import { apiGet, apiPost, apiDelete } from './client';
import type {
  DlqRow,
  DlqRetryResponse,
  AuditPage,
  AuditListParams,
  DlqListParams,
} from '@levelup/types';

// ---------------------------------------------------------------------------
// DLQ
// ---------------------------------------------------------------------------

export async function listDlq(params?: Partial<DlqListParams>): Promise<DlqRow[]> {
  return apiGet<DlqRow[]>('/admin/ops/dlq', {
    params: params as Record<string, string | number | boolean | undefined | null>,
  });
}

export async function getDlqRow(id: string): Promise<DlqRow> {
  return apiGet<DlqRow>(`/admin/ops/dlq/${id}`);
}

export async function retryDlqRow(id: string): Promise<DlqRetryResponse> {
  return apiPost<Record<string, never>, DlqRetryResponse>(`/admin/ops/dlq/${id}/retry`, {});
}

export async function deleteDlqRow(id: string): Promise<void> {
  return apiDelete<void>(`/admin/ops/dlq/${id}`);
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function listAudit(params?: Partial<AuditListParams>): Promise<AuditPage> {
  return apiGet<AuditPage>('/admin/ops/audit', {
    params: params as Record<string, string | number | boolean | undefined | null>,
  });
}

export async function listAuditActions(): Promise<string[]> {
  return apiGet<string[]>('/admin/ops/audit/actions');
}

/**
 * Export the currently loaded audit rows as a CSV file, downloaded client-side.
 *
 * TODO: Replace with a server-side streaming endpoint when row counts grow
 * beyond what is comfortable to load into memory (e.g. > 10 000 rows).
 * The server endpoint should stream NDJSON or CSV directly so the browser
 * download does not require the full payload in JS heap.
 */
export function exportAuditCsv(rows: AuditPage['rows'], filename = 'audit-log.csv'): void {
  const headers = [
    'Time',
    'Actor ID',
    'Actor Name',
    'Actor Email',
    'Action',
    'Target Type',
    'Target ID',
    'Metadata',
    'Organization ID',
  ];

  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    // Wrap in quotes and escape any internal quotes
    return `"${s.replace(/"/g, '""')}"`;
  };

  const csvLines: string[] = [headers.map(escape).join(',')];
  for (const row of rows) {
    csvLines.push(
      [
        row.createdAt,
        row.actorId ?? '',
        row.actor?.name ?? '',
        row.actor?.email ?? '',
        row.action,
        row.targetType ?? '',
        row.targetId ?? '',
        row.metadata ? JSON.stringify(row.metadata) : '',
        row.organizationId,
      ]
        .map(escape)
        .join(','),
    );
  }

  const blob = new Blob([csvLines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
