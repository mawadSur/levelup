'use client';

import * as React from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from '@levelup/ui';
import { MoreHorizontal, RefreshCw, Trash2, Eye, RotateCcw } from 'lucide-react';
import { adminOps } from '@/lib/api';
import type { DlqRow } from '@levelup/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

// ---------------------------------------------------------------------------
// Confirm dialog (shared)
// ---------------------------------------------------------------------------

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Detail dialog
// ---------------------------------------------------------------------------

interface DetailDialogProps {
  row: DlqRow | null;
  onClose: () => void;
}

function DetailDialog({ row, onClose }: DetailDialogProps) {
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Job data — {row?.jobName}</DialogTitle>
          <DialogDescription>
            Job ID: {row?.jobId} &middot; {row ? formatDate(row.createdAt) : ''}
          </DialogDescription>
        </DialogHeader>
        {row && (
          <pre className="max-h-96 overflow-auto rounded-md bg-ink-700 p-4 text-xs font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(row.data, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Row action menu
// ---------------------------------------------------------------------------

interface RowActionsProps {
  row: DlqRow;
  onView: (row: DlqRow) => void;
  onRetry: (row: DlqRow) => void;
  onDelete: (row: DlqRow) => void;
}

function RowActions({ row, onView, onRetry, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(row)}>
          <Eye className="mr-2 h-4 w-4" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRetry(row)}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(row)} className="text-danger focus:text-danger">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  rows: DlqRow[];
  jobNameFilter: string;
  sinceFilter: string;
  onJobNameChange: (v: string) => void;
  onSinceChange: (v: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

function FilterBar({
  rows,
  jobNameFilter,
  sinceFilter,
  onJobNameChange,
  onSinceChange,
  onRefresh,
  loading,
}: FilterBarProps) {
  const distinctJobNames = React.useMemo(() => {
    const names = Array.from(new Set(rows.map((r) => r.jobName))).sort();
    return names;
  }, [rows]);

  return (
    <div className="flex flex-wrap items-center gap-3 pb-4">
      <Select value={jobNameFilter} onValueChange={onJobNameChange}>
        <SelectTrigger className="h-8 w-48 text-xs">
          <SelectValue placeholder="All job names" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All job names</SelectItem>
          {distinctJobNames.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        type="date"
        value={sinceFilter}
        onChange={(e) => onSinceChange(e.target.value)}
        className="h-8 rounded-md border border-ink-500 bg-ink-900 px-3 text-xs"
        aria-label="Since date"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="h-8 text-xs"
      >
        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main table component
// ---------------------------------------------------------------------------

interface DlqTableProps {
  initialRows: DlqRow[];
}

export function DlqTable({ initialRows }: DlqTableProps) {
  const [rows, setRows] = React.useState<DlqRow[]>(initialRows);
  const [loading, setLoading] = React.useState(false);

  // Filters
  const [jobNameFilter, setJobNameFilter] = React.useState('__all__');
  const [sinceFilter, setSinceFilter] = React.useState('');

  // Dialogs
  const [detailRow, setDetailRow] = React.useState<DlqRow | null>(null);
  const [retryTarget, setRetryTarget] = React.useState<DlqRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DlqRow | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Filtered view
  const displayed = React.useMemo(() => {
    return rows.filter((r) => {
      if (jobNameFilter !== '__all__' && r.jobName !== jobNameFilter) return false;
      if (sinceFilter && new Date(r.createdAt) < new Date(sinceFilter)) return false;
      return true;
    });
  }, [rows, jobNameFilter, sinceFilter]);

  async function handleRefresh() {
    setLoading(true);
    try {
      const fresh = await adminOps.listDlq(
        jobNameFilter !== '__all__'
          ? { jobName: jobNameFilter, since: sinceFilter || undefined }
          : { since: sinceFilter || undefined },
      );
      setRows(fresh);
    } catch {
      toast({ title: 'Refresh failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryConfirm() {
    if (!retryTarget) return;
    setActionLoading(true);
    try {
      const result = await adminOps.retryDlqRow(retryTarget.id);
      toast({ title: `Retried — new job ${result.newJobId}` });
      setRetryTarget(null);
      await handleRefresh();
    } catch {
      toast({ title: 'Retry failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await adminOps.deleteDlqRow(deleteTarget.id);
      toast({ title: 'Row deleted' });
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <FilterBar
        rows={rows}
        jobNameFilter={jobNameFilter}
        sinceFilter={sinceFilter}
        onJobNameChange={setJobNameFilter}
        onSinceChange={setSinceFilter}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-paper-300">
          <span className="text-4xl">&#10003;</span>
          <p className="text-sm font-medium">No failed jobs. Workers are healthy.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink-600">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-600 bg-ink-700/50 text-xs text-paper-300">
                <th className="px-4 py-2 text-left font-medium">Job name</th>
                <th className="px-4 py-2 text-left font-medium">Job ID</th>
                <th className="px-4 py-2 text-right font-medium">Attempts</th>
                <th className="px-4 py-2 text-left font-medium">Failed reason</th>
                <th className="px-4 py-2 text-left font-medium">Created at</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-ink-600 last:border-0 hover:bg-ink-700/30 transition-colors"
                >
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {row.jobName}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-paper-300">{row.jobId}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.attempts}</td>
                  <td className="px-4 py-2 max-w-xs">
                    <span title={row.failedReason} className="cursor-help">
                      {truncate(row.failedReason, 80)}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-paper-300">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <RowActions
                      row={row}
                      onView={setDetailRow}
                      onRetry={setRetryTarget}
                      onDelete={setDeleteTarget}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail dialog */}
      <DetailDialog row={detailRow} onClose={() => setDetailRow(null)} />

      {/* Retry confirm dialog */}
      <ConfirmDialog
        open={!!retryTarget}
        title="Retry job"
        description={`Re-enqueue "${retryTarget?.jobName}" (job ${retryTarget?.jobId})?`}
        confirmLabel="Retry"
        loading={actionLoading}
        onConfirm={handleRetryConfirm}
        onCancel={() => setRetryTarget(null)}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete DLQ row"
        description="This will permanently remove the row. This action cannot be undone."
        confirmLabel="Delete"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
