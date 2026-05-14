import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@levelup/ui';
import { reports } from '@/lib/api';
import { ssrGet } from '@/lib/api/server-fetch';
import type { TeamSkillHeatmap } from '@/lib/api/skills';
import { ReportsPageClient } from './reports-page-client';

export const metadata: Metadata = {
  title: 'Reports — Admin',
};

const EMPTY_TEAM_HEATMAP: TeamSkillHeatmap = { users: [], skills: [], cells: [] };

export default async function AdminReportsPage() {
  const [completionReport, heatmapCells, riskFlags, skillTeamResult] = await Promise.all([
    reports.getCompletionReport(),
    reports.getDeptHeatmap(),
    reports.getRiskFlags(),
    ssrGet<TeamSkillHeatmap>('/admin/skills/team').catch(() => null),
  ]);

  const skillTeam = skillTeamResult ?? EMPTY_TEAM_HEATMAP;

  return (
    <Suspense fallback={<ReportsPageSkeleton />}>
      <ReportsPageClient
        completionReport={completionReport}
        heatmapCells={heatmapCells}
        riskFlags={riskFlags}
        skillTeam={skillTeam}
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
