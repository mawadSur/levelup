import type { Metadata } from 'next';
import { anomaly } from '@/lib/api';
import type { AnomalyAlertDto } from '@/lib/api/anomaly';
import { MonoLabel } from '@levelup/ui';
import { AnomalyList } from '@/components/admin/anomalies/anomaly-list';

export const metadata: Metadata = {
  title: 'Anomalies — Admin',
};

export default async function AnomaliesPage() {
  let initialItems: AnomalyAlertDto[] = [];
  try {
    const res = await anomaly.listAlerts({ unacknowledged: true, limit: 100 });
    initialItems = res.items;
  } catch {
    // Silently fall back to empty list — the client component shows a refresh button.
  }

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="mb-8 space-y-2">
        <MonoLabel>GOVERNANCE / ANOMALIES</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Anomaly alerts</h1>
        <p className="max-w-reading text-body text-paper-300">
          Proactively surfaced risk signals. The hourly scanner detects usage spikes, sensitive-data
          bursts, streak risks, path-builder abuse, and prompt-cloning. Acknowledge to dismiss.
        </p>
      </header>
      <AnomalyList initialItems={initialItems} />
    </div>
  );
}
