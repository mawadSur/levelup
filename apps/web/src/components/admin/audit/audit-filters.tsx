'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@levelup/ui';
import { Filter, Download } from 'lucide-react';
import { adminOps } from '@/lib/api';
import type { AuditPage } from '@levelup/types';

// ---------------------------------------------------------------------------
// Target type suggestions (extend as the system grows)
// ---------------------------------------------------------------------------
const TARGET_TYPES = [
  'User',
  'Organization',
  'LearningPath',
  'Lesson',
  'Assessment',
  'DeadLetterJob',
  'AuditLog',
  'Invitation',
  'Department',
  'Certificate',
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface AuditFiltersProps {
  /** Current loaded rows — used for CSV export */
  rows: AuditPage['rows'];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AuditFilters({ rows }: AuditFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state mirrors current URL params (pre-apply)
  const [action, setAction] = React.useState(searchParams.get('action') ?? '__all__');
  const [actorId, setActorId] = React.useState(searchParams.get('actorId') ?? '');
  const [targetType, setTargetType] = React.useState(searchParams.get('targetType') ?? '__all__');
  const [since, setSince] = React.useState(searchParams.get('since') ?? '');
  const [until, setUntil] = React.useState(searchParams.get('until') ?? '');

  // Distinct actions fetched from server
  const [actionOptions, setActionOptions] = React.useState<string[]>([]);

  React.useEffect(() => {
    adminOps
      .listAuditActions()
      .then(setActionOptions)
      .catch(() => {});
  }, []);

  function handleApply() {
    const params = new URLSearchParams();
    if (action && action !== '__all__') params.set('action', action);
    if (actorId.trim()) params.set('actorId', actorId.trim());
    if (targetType && targetType !== '__all__') params.set('targetType', targetType);
    if (since) params.set('since', since);
    if (until) params.set('until', until);
    // Clear cursor on new filter
    params.delete('cursor');
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleExportCsv() {
    if (rows.length === 0) {
      toast({ title: 'No rows to export' });
      return;
    }
    try {
      adminOps.exportAuditCsv(rows);
      toast({ title: `Exported ${rows.length} rows` });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 pb-4">
      {/* Action */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-paper-300">Action</label>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-8 w-52 text-xs">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All actions</SelectItem>
            {actionOptions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actor */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-paper-300">Actor ID</label>
        <Input
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          placeholder="cuid..."
          className="h-8 w-48 text-xs font-mono"
        />
      </div>

      {/* Target type */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-paper-300">Target type</label>
        <Select value={targetType} onValueChange={setTargetType}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            {TARGET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Since */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-paper-300">From</label>
        <input
          type="date"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          className="h-8 rounded-md border border-ink-500 bg-ink-900 px-3 text-xs"
          aria-label="Since date"
        />
      </div>

      {/* Until */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-paper-300">To</label>
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="h-8 rounded-md border border-ink-500 bg-ink-900 px-3 text-xs"
          aria-label="Until date"
        />
      </div>

      {/* Apply */}
      <Button variant="default" size="sm" onClick={handleApply} className="h-8 text-xs">
        <Filter className="mr-1.5 h-3.5 w-3.5" />
        Apply
      </Button>

      {/* Export CSV */}
      <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-8 text-xs">
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export CSV
      </Button>
    </div>
  );
}
