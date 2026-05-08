'use client';

/**
 * AnomalyList — renders anomaly alerts grouped by severity with auto-refresh
 * and acknowledge buttons.
 */

import * as React from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, RefreshCw, User } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, toast } from '@levelup/ui';
import { anomaly } from '@/lib/api';
import type { AnomalyAlertDto, AnomalySeverityValue } from '@/lib/api/anomaly';

const AUTO_REFRESH_MS = 60_000;

const SEVERITY_ORDER: AnomalySeverityValue[] = ['HIGH', 'MEDIUM', 'LOW'];

const SEVERITY_COLORS: Record<AnomalySeverityValue, string> = {
  HIGH: 'bg-danger text-danger-foreground',
  MEDIUM: 'bg-warning text-white',
  LOW: 'bg-ink-700 text-paper-300',
};

const KIND_LABELS: Record<string, string> = {
  COACH_USAGE_SPIKE: 'Usage spike',
  SENSITIVE_DATA_BURST: 'Sensitive data burst',
  STREAK_BROKEN_AT_RISK: 'Streak at risk',
  PATH_BUILDER_ABUSE: 'Path builder abuse',
  PROMPT_CLONING_ABUSE: 'Prompt cloning',
};

interface AnomalyListProps {
  initialItems: AnomalyAlertDto[];
}

export function AnomalyList({ initialItems }: AnomalyListProps) {
  const [items, setItems] = React.useState<AnomalyAlertDto[]>(initialItems);
  const [acknowledging, setAcknowledging] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [expandedSignals, setExpandedSignals] = React.useState<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Auto-refresh every 60s
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    const id = window.setInterval(async () => {
      await refresh(false);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  async function refresh(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const res = await anomaly.listAlerts({ unacknowledged: true, limit: 100 });
      setItems(res.items);
    } catch (err) {
      if (showLoading) {
        toast({
          title: 'Refresh failed',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Acknowledge
  // ---------------------------------------------------------------------------
  async function handleAcknowledge(id: string) {
    setAcknowledging((prev) => new Set(prev).add(id));
    try {
      await anomaly.acknowledgeAlert(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
      toast({ title: 'Alert acknowledged.' });
    } catch (err) {
      toast({
        title: 'Failed to acknowledge',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setAcknowledging((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function toggleSignal(id: string) {
    setExpandedSignals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Group by severity
  // ---------------------------------------------------------------------------
  const grouped = SEVERITY_ORDER.reduce<Record<AnomalySeverityValue, AnomalyAlertDto[]>>(
    (acc, sev) => {
      acc[sev] = items.filter((a) => a.severity === sev);
      return acc;
    },
    { HIGH: [], MEDIUM: [], LOW: [] },
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-600 py-16 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <div>
          <p className="font-semibold text-paper-100">No unacknowledged alerts</p>
          <p className="mt-1 text-sm text-paper-300">
            Your platform looks healthy. Auto-refreshes every minute.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-paper-300">
          {items.length} unacknowledged alert{items.length !== 1 ? 's' : ''}. Auto-refreshes every
          minute.
        </p>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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
              {group.map((alert) => (
                <AnomalyAlertRow
                  key={alert.id}
                  alert={alert}
                  severityClass={SEVERITY_COLORS[severity]}
                  acknowledging={acknowledging.has(alert.id)}
                  signalExpanded={expandedSignals.has(alert.id)}
                  onAcknowledge={() => void handleAcknowledge(alert.id)}
                  onToggleSignal={() => toggleSignal(alert.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual alert row
// ---------------------------------------------------------------------------

interface AnomalyAlertRowProps {
  alert: AnomalyAlertDto;
  severityClass: string;
  acknowledging: boolean;
  signalExpanded: boolean;
  onAcknowledge: () => void;
  onToggleSignal: () => void;
}

function AnomalyAlertRow({
  alert,
  severityClass,
  acknowledging,
  signalExpanded,
  onAcknowledge,
  onToggleSignal,
}: AnomalyAlertRowProps) {
  const kindLabel = KIND_LABELS[alert.kind] ?? alert.kind;
  const createdAt = new Date(alert.createdAt);
  const relativeTime = formatRelative(createdAt);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 pb-0">
        <div className="flex items-start gap-3">
          <Badge className={`${severityClass} shrink-0`}>{alert.severity}</Badge>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold">{kindLabel}</CardTitle>
            <div className="mt-1 flex items-center gap-2 text-xs text-paper-300">
              {(alert.userName ?? alert.userId) && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {alert.userName ?? alert.userId}
                  {alert.userEmail && ` (${alert.userEmail})`}
                </span>
              )}
              <span>{relativeTime}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={onToggleSignal}
            >
              Signal
              <ChevronDown
                className={`h-3 w-3 transition-transform ${signalExpanded ? 'rotate-180' : ''}`}
              />
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={onAcknowledge}
              disabled={acknowledging}
            >
              <CheckCircle2 className="h-3 w-3" />
              {acknowledging ? 'Acking…' : 'Acknowledge'}
            </Button>
          </div>
        </div>
      </CardHeader>
      {signalExpanded && (
        <CardContent className="pt-3 pb-3">
          <pre className="overflow-x-auto rounded-md bg-ink-700 p-3 text-xs text-paper-300">
            {JSON.stringify(alert.signal, null, 2)}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
