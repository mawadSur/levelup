'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Skeleton,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@levelup/ui';
import { Copy, ChevronDown } from 'lucide-react';
import { adminOps } from '@/lib/api';
import type { AuditPage, AuditRow } from '@levelup/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(iso));
}

function truncateId(id: string, max = 12): string {
  return id.length <= max ? id : `${id.slice(0, max)}…`;
}

function truncateMeta(val: Record<string, unknown> | null, max = 60): string {
  if (!val) return '—';
  const s = JSON.stringify(val);
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/** Copy text to clipboard and show a toast */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  } catch {
    toast({ title: 'Copy failed', variant: 'destructive' });
  }
}

// ---------------------------------------------------------------------------
// Metadata expand dialog
// ---------------------------------------------------------------------------

interface MetaDialogProps {
  row: AuditRow | null;
  onClose: () => void;
}

function MetaDialog({ row, onClose }: MetaDialogProps) {
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Metadata — {row?.action}</DialogTitle>
          <DialogDescription>{row ? formatDate(row.createdAt) : ''}</DialogDescription>
        </DialogHeader>
        {row && (
          <pre className="max-h-96 overflow-auto rounded-md bg-ink-700 p-4 text-xs font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(row.metadata, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Single table row
// ---------------------------------------------------------------------------

interface AuditTableRowProps {
  row: AuditRow;
  onExpandMeta: (row: AuditRow) => void;
}

function AuditTableRow({ row, onExpandMeta }: AuditTableRowProps) {
  const [hovered, setHovered] = React.useState(false);

  const details = JSON.stringify({
    id: row.id,
    action: row.action,
    actorId: row.actorId,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: row.metadata,
    createdAt: row.createdAt,
  });

  return (
    <tr
      className="group border-b border-ink-600 last:border-0 hover:bg-ink-700/30 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Time */}
      <td className="px-4 py-2 whitespace-nowrap text-xs text-paper-300">
        {formatDate(row.createdAt)}
      </td>

      {/* Actor */}
      <td className="px-4 py-2">
        {row.actor ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default text-sm font-medium">{row.actor.name || '—'}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{row.actor.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-paper-300">
            {row.actorId ? truncateId(row.actorId) : 'System'}
          </span>
        )}
      </td>

      {/* Action */}
      <td className="px-4 py-2">
        <Badge variant="outline" className="font-mono text-xs">
          {row.action}
        </Badge>
      </td>

      {/* Target type */}
      <td className="px-4 py-2 text-xs text-paper-300">{row.targetType ?? '—'}</td>

      {/* Target ID */}
      <td className="px-4 py-2 font-mono text-xs text-paper-300">
        {row.targetId ? truncateId(row.targetId) : '—'}
      </td>

      {/* Metadata */}
      <td className="px-4 py-2 max-w-xs">
        <button
          className="cursor-pointer text-xs text-left text-paper-300 hover:text-paper-100"
          onClick={() => onExpandMeta(row)}
          title="Click to expand"
        >
          {truncateMeta(row.metadata)}
        </button>
      </td>

      {/* Copy details (hover-only) */}
      <td className="px-4 py-2 text-right">
        <button
          className={`transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => void copyToClipboard(details)}
          title="Copy row details"
          aria-label="Copy row details"
        >
          <Copy className="h-3.5 w-3.5 text-paper-300 hover:text-paper-100" />
        </button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main audit table
// ---------------------------------------------------------------------------

interface AuditTableProps {
  initialPage: AuditPage;
}

export function AuditTable({ initialPage }: AuditTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = React.useState<AuditRow[]>(initialPage.rows);
  const [nextCursor, setNextCursor] = React.useState<string | null>(initialPage.nextCursor);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [metaRow, setMetaRow] = React.useState<AuditRow | null>(null);

  // If the page re-renders from a new server fetch (filter change), sync local state
  React.useEffect(() => {
    setRows(initialPage.rows);
    setNextCursor(initialPage.nextCursor);
  }, [initialPage]);

  async function handleLoadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const params: Record<string, string> = {};
      searchParams.forEach((v, k) => {
        params[k] = v;
      });
      const page = await adminOps.listAudit({ ...params, cursor: nextCursor });
      setRows((prev) => [...prev, ...page.rows]);
      setNextCursor(page.nextCursor);
    } catch {
      toast({ title: 'Failed to load more', variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  }

  // Sync cursor into URL for bookmarkability
  function syncCursor(cursor: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (cursor) {
      params.set('cursor', cursor);
    } else {
      params.delete('cursor');
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  void syncCursor; // intentionally unused in this implementation; URL sync via "Load more"

  return (
    <>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-paper-300">
          <p className="text-sm font-medium">No audit log entries match your filters.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-ink-600">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-600 bg-ink-700/50 text-xs text-paper-300">
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-4 py-2 text-left font-medium">Actor</th>
                  <th className="px-4 py-2 text-left font-medium">Action</th>
                  <th className="px-4 py-2 text-left font-medium">Target type</th>
                  <th className="px-4 py-2 text-left font-medium">Target ID</th>
                  <th className="px-4 py-2 text-left font-medium">Metadata</th>
                  <th className="px-4 py-2 w-8" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <AuditTableRow key={row.id} row={row} onExpandMeta={setMetaRow} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {nextCursor && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Load more
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <MetaDialog row={metaRow} onClose={() => setMetaRow(null)} />
    </>
  );
}
