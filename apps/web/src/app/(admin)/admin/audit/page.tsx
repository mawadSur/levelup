import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MonoLabel, Skeleton } from '@levelup/ui';
import { adminOps } from '@/lib/api';
import { AuditFilters } from '@/components/admin/audit/audit-filters';
import { AuditTable } from '@/components/admin/audit/audit-table';
import type { AuditListParams } from '@levelup/types';

export const metadata: Metadata = {
  title: 'Audit Log — Admin',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const params: Partial<AuditListParams> = {
    action: firstString(sp['action']),
    actorId: firstString(sp['actorId']),
    targetType: firstString(sp['targetType']),
    since: firstString(sp['since']),
    until: firstString(sp['until']),
    cursor: firstString(sp['cursor']),
    limit: sp['limit'] ? Number(sp['limit']) : undefined,
  };

  const page = await adminOps.listAudit(params).catch(() => ({
    rows: [],
    nextCursor: null,
  }));

  return (
    <div className="mx-auto max-w-content space-y-6 px-6 py-10">
      <header className="space-y-2">
        <MonoLabel>GOVERNANCE / AUDIT</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Audit log</h1>
        <p className="max-w-reading text-body text-paper-300">
          A record of all mutating actions performed within your organisation. Scoped to your org —
          use the filters to narrow results.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        }
      >
        <AuditFilters rows={page.rows} />
      </Suspense>

      <Suspense
        fallback={
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        }
      >
        <AuditTable initialPage={page} />
      </Suspense>
    </div>
  );
}
