import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ssrGet } from '@/lib/api/server-fetch';
import { ApiError } from '@/lib/api/errors';
import type { IncidentDetail } from '@/lib/api/incidents';
import { MonoLabel, Badge, Card, CardContent, CardHeader, CardTitle } from '@levelup/ui';

export const metadata: Metadata = {
  title: 'Incident detail — Admin',
};

export const dynamic = 'force-dynamic';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-danger text-danger-foreground',
  HIGH: 'bg-warning text-white',
  MEDIUM: 'bg-amber-500 text-white',
  LOW: 'bg-ink-700 text-paper-300',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-danger/15 text-danger',
  ACKNOWLEDGED: 'bg-warning/15 text-warning',
  SUGGESTED: 'bg-amber-500/15 text-amber-400',
  REMEDIATED: 'bg-success/15 text-success',
  DISMISSED: 'bg-ink-600 text-paper-300',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params;
  let detail: IncidentDetail;
  try {
    detail = await ssrGet<IncidentDetail>(`/incidents/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="mb-8 space-y-2">
        <Link
          href="/admin/incidents"
          className="text-xs text-paper-300 underline decoration-dotted hover:text-paper-100"
        >
          ← Back to incidents
        </Link>
        <MonoLabel>GOVERNANCE / INCIDENT</MonoLabel>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={SEVERITY_COLORS[detail.severity] ?? ''}>{detail.severity}</Badge>
          <Badge className={STATUS_COLORS[detail.status] ?? ''}>{detail.status}</Badge>
          <h1 className="font-serif text-display-md italic text-paper-100">
            {prettyKind(detail.kind)}
          </h1>
        </div>
        <p className="text-sm text-paper-300">
          Opened {new Date(detail.openedAt).toLocaleString()} · triggered by {detail.triggeredBy}
          {detail.resolvedAt && <> · resolved {new Date(detail.resolvedAt).toLocaleString()}</>}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="text-paper-100">{detail.userName ?? detail.userId}</div>
            {detail.userEmail && <div className="text-paper-300">{detail.userEmail}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Assigned remediation lab</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {detail.assignedRemediationLabSlug ? (
              <Link
                href={`/learn/labs/${detail.assignedRemediationLabSlug}`}
                className="text-paper-100 underline decoration-dotted"
              >
                {detail.assignedRemediationLabTitle ?? detail.assignedRemediationLabSlug}
              </Link>
            ) : (
              <span className="text-paper-300">None</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Signal</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-ink-700 p-3 text-xs text-paper-300">
            {JSON.stringify(detail.signal, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.history.length === 0 ? (
            <p className="text-sm text-paper-300">No history yet.</p>
          ) : (
            <ol className="space-y-3 text-sm">
              {detail.history.map((h) => (
                <li key={h.id} className="rounded-md border border-ink-600 bg-ink-800/40 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-xs text-paper-100">{h.action}</code>
                    <span className="text-xs text-paper-300">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                    {h.actorName && (
                      <span className="text-xs text-paper-300">by {h.actorName}</span>
                    )}
                  </div>
                  {h.metadata != null && (
                    <pre className="mt-2 overflow-x-auto rounded bg-ink-700 p-2 text-[11px] text-paper-300">
                      {JSON.stringify(h.metadata, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function prettyKind(kind: string): string {
  return kind
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
