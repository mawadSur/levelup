import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@levelup/ui';
import { reports } from '@/lib/api';
import { ReportsPageClient } from './reports-page-client';

export const metadata: Metadata = {
  title: 'Reports — Admin',
};

export default async function AdminReportsPage() {
  const [completionReport, heatmapCells, riskFlags] = await Promise.all([
    reports.getCompletionReport(),
    reports.getDeptHeatmap(),
    reports.getRiskFlags(),
  ]);

  return (
    <Suspense fallback={<ReportsPageSkeleton />}>
      <ReportsPageClient
        completionReport={completionReport}
        heatmapCells={heatmapCells}
        riskFlags={riskFlags}
      />
    </Suspense>
  );
}

function ReportsPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
