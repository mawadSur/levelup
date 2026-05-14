import type { Metadata } from 'next';
import { ssrGet } from '@/lib/api/server-fetch';
import type { IncidentDto } from '@/lib/api/incidents';
import { MonoLabel } from '@levelup/ui';
import { IncidentList } from '@/components/admin/incidents/incident-list';

export const metadata: Metadata = {
  title: 'Incidents — Admin',
};

export const dynamic = 'force-dynamic';

export default async function IncidentsPage() {
  let initialItems: IncidentDto[] = [];
  try {
    const res = await ssrGet<{ items: IncidentDto[] }>(
      '/incidents?status=OPEN,ACKNOWLEDGED,SUGGESTED&limit=100',
    );
    initialItems = res.items;
  } catch {
    // Fall back to empty list — the client component will retry via the
    // refresh button + auto-refresh interval.
  }

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="mb-8 space-y-2">
        <MonoLabel>GOVERNANCE / INCIDENTS</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Incidents</h1>
        <p className="max-w-reading text-body text-paper-300">
          Auto-generated from sensitive-data triggers and ad-rule violations. Acknowledge to accept
          ownership, promote suggested incidents to OPEN, dismiss with a reason, or mark remediated.
          Assigned remediation labs auto-resolve incidents on first pass.
        </p>
      </header>
      <IncidentList initialItems={initialItems} />
    </div>
  );
}
