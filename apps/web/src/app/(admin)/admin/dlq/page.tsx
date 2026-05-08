import type { Metadata } from 'next';
import { Skeleton } from '@levelup/ui';
import { Suspense } from 'react';
import { adminOps } from '@/lib/api';
import { DlqTable } from '@/components/admin/dlq/dlq-table';

export const metadata: Metadata = {
  title: 'Dead-Letter Queue — Admin',
};

export default async function AdminDlqPage() {
  const rows = await adminOps.listDlq().catch(() => []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dead-Letter Queue</h1>
        <p className="text-sm text-paper-300">
          Failed BullMQ jobs that exhausted all retry attempts. Use the actions menu to inspect the
          payload, re-enqueue, or permanently remove a row.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        }
      >
        <DlqTable initialRows={rows} />
      </Suspense>
    </div>
  );
}
