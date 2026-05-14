'use client';

/**
 * IncidentList — admin incident workflow loop view.
 *
 * Renders incidents grouped by severity with filter chips for severity +
 * status and a "show resolved (last 30d)" toggle. Each row supports the
 * MANAGER+ state transitions inline (acknowledge / promote / dismiss /
 * remediated). Auto-refreshes every 60s.
 */

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, toast } from '@levelup/ui';
import { incidents } from '@/lib/api';
import type {
  IncidentDto,
  IncidentKind,
  IncidentSeverity,
  IncidentStatus,
} from '@/lib/api/incidents';

const AUTO_REFRESH_MS = 60_000;

const SEVERITY_ORDER: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  CRITICAL: 'bg-danger text-danger-foreground',
  HIGH: 'bg-warning text-white',
  MEDIUM: 'bg-amber-500 text-white',
  LOW: 'bg-ink-700 text-paper-300',
};

const STATUS_COLORS: Record<IncidentStatus, string> = {
  OPEN: 'bg-danger/15 text-danger',
  ACKNOWLEDGED: 'bg-warning/15 text-warning',
  SUGGESTED: 'bg-amber-500/15 text-amber-400',
  REMEDIATED: 'bg-success/15 text-success',
  DISMISSED: 'bg-ink-600 text-paper-300',
};

const KIND_LABELS: Record<IncidentKind, string> = {
  SENSITIVE_DATA_LEAK: 'Sensitive data leak',
  POLICY_VIOLATION: 'Policy violation',
  AD_RULE_VIOLATION: 'Ad-rule violation',
  AI_HALLUCINATION_REPORTED: 'AI hallucination',
  OTHER: 'Other',
};

const ALL_SEVERITIES: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const ACTIVE_STATUSES: IncidentStatus[] = ['OPEN', 'ACKNOWLEDGED', 'SUGGESTED'];
const ALL_STATUSES: IncidentStatus[] = [
  'OPEN',
  'ACKNOWLEDGED',
  'SUGGESTED',
  'REMEDIATED',
  'DISMISSED',
];

interface IncidentListProps {
  initialItems: IncidentDto[];
}

export function IncidentList({ initialItems }: IncidentListProps) {
  const [items, setItems] = React.useState<IncidentDto[]>(initialItems);
  const [loading, setLoading] = React.useState(false);
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = React.useState<IncidentSeverity[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<IncidentStatus[]>([]);
  const [showResolved, setShowResolved] = React.useState(false);

  const refresh = React.useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const params: Parameters<typeof incidents.listIncidents>[0] = {};
        if (severityFilter.length > 0) params.severity = severityFilter;
        if (statusFilter.length > 0) {
          params.status = statusFilter;
        } else if (showResolved) {
          params.includeResolvedSinceDays = 30;
        } else {
          params.status = ACTIVE_STATUSES;
        }
        const res = await incidents.listIncidents(params);
        setItems(res.items);
      } catch (err) {
        if (showSpinner) {
          toast({
            title: 'Refresh failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
        }
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [severityFilter, statusFilter, showResolved],
  );

  // Auto-refresh
  React.useEffect(() => {
    const id = window.setInterval(() => {
      void refresh(false);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Refetch when filters change
  React.useEffect(() => {
    void refresh(true);
  }, [refresh]);

  function toggleSeverity(sev: IncidentSeverity) {
    setSeverityFilter((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev],
    );
  }

  function toggleStatus(s: IncidentStatus) {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function handleAction(
    id: string,
    action: 'acknowledge' | 'promote' | 'dismiss' | 'remediated',
  ) {
    let reason: string | null = null;
    if (action === 'dismiss') {
      reason = window.prompt('Reason for dismissal:');
      if (!reason || reason.trim().length === 0) return;
    }

    setPending((prev) => new Set(prev).add(id));
    try {
      let updated: IncidentDto;
      if (action === 'acknowledge') updated = await incidents.acknowledgeIncident(id);
      else if (action === 'promote') updated = await incidents.promoteIncident(id);
      else if (action === 'dismiss') updated = await incidents.dismissIncident(id, reason ?? '');
      else updated = await incidents.remediatedIncident(id);

      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      toast({ title: `Incident ${action === 'remediated' ? 'remediated' : action + 'd'}.` });
    } catch (err) {
      toast({
        title: `Action failed`,
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const grouped = SEVERITY_ORDER.reduce<Record<IncidentSeverity, IncidentDto[]>>(
    (acc, sev) => {
      acc[sev] = items.filter((i) => i.severity === sev);
      return acc;
    },
    { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] },
  );

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-paper-300">
              Severity:
            </span>
            {ALL_SEVERITIES.map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => toggleSeverity(sev)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  severityFilter.includes(sev)
                    ? SEVERITY_COLORS[sev]
                    : 'border border-ink-600 text-paper-300 hover:border-paper-300'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-paper-300">
              Status:
            </span>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  statusFilter.includes(s)
                    ? STATUS_COLORS[s]
                    : 'border border-ink-600 text-paper-300 hover:border-paper-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="ml-auto flex items-center gap-2 text-xs text-paper-300">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              disabled={statusFilter.length > 0}
            />
            Show resolved (last 30d)
          </label>

          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-600 py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <div>
            <p className="font-semibold text-paper-100">No incidents match these filters</p>
            <p className="mt-1 text-sm text-paper-300">Auto-refreshes every minute.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-paper-300">
            {items.length} incident{items.length !== 1 ? 's' : ''}. Auto-refreshes every minute.
          </p>

          {SEVERITY_ORDER.map((severity) => {
            const group = grouped[severity];
            if (group.length === 0) return null;
            return (
              <section key={severity}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-paper-300">
                  <AlertTriangle className="h-4 w-4" />
                  {severity} ({group.length})
                </h2>
                <div className="space-y-3">
                  {group.map((inc) => (
                    <IncidentRow
                      key={inc.id}
                      incident={inc}
                      pending={pending.has(inc.id)}
                      onAction={(action) => void handleAction(inc.id, action)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

interface IncidentRowProps {
  incident: IncidentDto;
  pending: boolean;
  onAction: (action: 'acknowledge' | 'promote' | 'dismiss' | 'remediated') => void;
}

function IncidentRow({ incident, pending, onAction }: IncidentRowProps) {
  const opened = new Date(incident.openedAt);
  const relativeTime = formatRelative(opened);
  const canAcknowledge = incident.status === 'OPEN' || incident.status === 'SUGGESTED';
  const canPromote = incident.status === 'SUGGESTED';
  const canDismiss =
    incident.status === 'OPEN' ||
    incident.status === 'ACKNOWLEDGED' ||
    incident.status === 'SUGGESTED';
  const canRemediate =
    incident.status === 'OPEN' ||
    incident.status === 'ACKNOWLEDGED' ||
    incident.status === 'SUGGESTED';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <div className="flex items-start gap-3">
          <Badge className={`${SEVERITY_COLORS[incident.severity]} shrink-0`}>
            {incident.severity}
          </Badge>
          <Badge className={`${STATUS_COLORS[incident.status]} shrink-0`}>{incident.status}</Badge>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold">{KIND_LABELS[incident.kind]}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-paper-300">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {incident.userName ?? incident.userId}
                {incident.userEmail && ` (${incident.userEmail})`}
              </span>
              <span>{relativeTime}</span>
              <span>via {incident.triggeredBy}</span>
              {incident.assignedRemediationLabSlug && (
                <Link
                  href={`/learn/labs/${incident.assignedRemediationLabSlug}`}
                  className="flex items-center gap-1 text-paper-100 underline decoration-dotted hover:text-paper-50"
                >
                  <ShieldAlert className="h-3 w-3" />
                  Lab: {incident.assignedRemediationLabTitle ?? incident.assignedRemediationLabSlug}
                </Link>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {canAcknowledge && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onAction('acknowledge')}
                disabled={pending}
              >
                Acknowledge
              </Button>
            )}
            {canPromote && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onAction('promote')}
                disabled={pending}
              >
                Promote
              </Button>
            )}
            {canRemediate && (
              <Button
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => onAction('remediated')}
                disabled={pending}
              >
                <CheckCircle2 className="h-3 w-3" />
                Mark remediated
              </Button>
            )}
            {canDismiss && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-paper-300"
                onClick={() => onAction('dismiss')}
                disabled={pending}
              >
                <X className="h-3 w-3" />
                Dismiss
              </Button>
            )}
            <Link
              href={`/admin/incidents/${incident.id}`}
              className="ml-1 inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-paper-300 hover:bg-ink-700"
            >
              Detail
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
