'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  toast,
} from '@levelup/ui';
import type { DataExportRequestDto } from '@levelup/types';
import { privacy } from '@/lib/api';

// ---------------------------------------------------------------------------
// Status badge colours
// ---------------------------------------------------------------------------

const STATUS_VARIANTS: Record<
  DataExportRequestDto['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'secondary',
  PROCESSING: 'secondary',
  READY: 'default',
  EXPIRED: 'outline',
  FAILED: 'destructive',
};

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  initialRequests: DataExportRequestDto[];
}

export function DataExportRequest({ initialRequests }: Props) {
  const [requests, setRequests] = useState<DataExportRequestDto[]>(initialRequests);
  const [isPending, startTransition] = useTransition();

  function handleExportRequest() {
    startTransition(async () => {
      try {
        const newRequest = await privacy.requestExport();
        setRequests((prev) => [newRequest, ...prev]);
        toast({
          title: 'Export requested',
          description:
            "We're building your data archive. You'll be able to download it here when ready.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to request export.';
        toast({
          title: 'Could not create export',
          description: message,
          variant: 'destructive',
        });
      }
    });
  }

  // Active export = any PENDING or PROCESSING request
  const hasActiveExport = requests.some((r) => r.status === 'PENDING' || r.status === 'PROCESSING');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export your data</CardTitle>
        <CardDescription>
          Download a complete archive of everything we hold about you — progress, assessments, coach
          conversations, badges, and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleExportRequest} disabled={isPending || hasActiveExport}>
          {isPending ? 'Requesting…' : hasActiveExport ? 'Export in progress…' : 'Export my data'}
        </Button>

        {requests.length === 0 ? (
          <p className="text-sm text-paper-300 italic">
            You haven&apos;t exported your data yet. We&apos;ll email you when it&apos;s ready.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {requests.map((req) => (
              <li
                key={req.id}
                className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[req.status]}>{req.status}</Badge>
                    <span className="text-xs text-paper-300">
                      {new Date(req.requestedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {req.fileSizeBytes !== null && (
                      <span className="text-xs text-paper-300">
                        {formatBytes(req.fileSizeBytes)}
                      </span>
                    )}
                  </div>
                  {req.status === 'READY' && req.expiresAt && (
                    <p className="text-xs text-paper-300">
                      Expires{' '}
                      {new Date(req.expiresAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  {req.status === 'FAILED' && req.failedReason && (
                    <p className="text-xs text-danger">{req.failedReason}</p>
                  )}
                </div>
                {req.status === 'READY' && (
                  <a href={`/api/privacy/exports/${req.id}/download`} download className="shrink-0">
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
