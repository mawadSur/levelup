import type { Metadata } from 'next';
import { anomaly } from '@/lib/api';
import type { AnomalyAlertDto } from '@/lib/api/anomaly';
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-paper-100">Anomaly alerts</h1>
        <p className="text-sm text-paper-300">
          Proactively surfaced risk signals. Hourly scanner detects usage spikes, sensitive-data
          bursts, streak risks, path-builder abuse, and prompt-cloning. Acknowledge to dismiss.
        </p>
      </div>
      <AnomalyList initialItems={initialItems} />
    </div>
  );
}
