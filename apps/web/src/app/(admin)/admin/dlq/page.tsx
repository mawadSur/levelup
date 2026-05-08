import type { Metadata } from 'next';
import { MonoLabel, Skeleton } from '@levelup/ui';
import { Suspense } from 'react';
import { adminOps } from '@/lib/api';
import { DlqTable } from '@/components/admin/dlq/dlq-table';

export const metadata: Metadata = {
  title: 'Dead-Letter Queue — Admin',
};

export default async function AdminDlqPage() {
  const rows = await adminOps.listDlq().catch(() => []);

  return (
    <div className="mx-auto max-w-content space-y-8 px-6 py-10">
      <header className="space-y-2">
        <MonoLabel>OPS / DLQ</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Dead-letter queue</h1>
        <p className="max-w-reading text-body text-paper-300">
          Failed BullMQ jobs that exhausted all retry attempts. Use the actions menu to inspect the
          payload, re-enqueue, or permanently remove a row.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-sm" />
            ))}
          </div>
        }
      >
        <DlqTable initialRows={rows} />
      </Suspense>
    </div>
  );
}
