import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MonoLabel } from '@levelup/ui';
import { getSessionUser } from '@/lib/auth-client';
import { users, paths as pathsApi, progress } from '@/lib/api';
import { TeamTable } from '@/components/learn/team/team-table';
import { CoachingSuggestions } from '@/components/learn/team/coaching-suggestions';
import { TeamFilterPills } from '@/components/learn/team/team-filter-pills';
import { TeamStudyPlansCard } from '@/components/learn/team/team-study-plans-card';
import type { TeamProgressEntry } from '@/lib/api/progress';
import { ssrGet } from '@/lib/api/server-fetch';
import type { TeamStudyPlanResponse } from '@levelup/types';

export const metadata: Metadata = {
  title: 'Your Team',
};

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function TeamPage({ searchParams }: PageProps) {
  const session = await getSessionUser();

  if (!session) {
    redirect('/sign-in?redirect=%2Fteam');
  }

  if (session.role === 'EMPLOYEE') {
    redirect('/learn');
  }

  const params = await searchParams;
  const activeFilter = params.filter ?? 'all';

  // Fetch team members + published paths in parallel
  const [usersResult, pathsResult] = await Promise.allSettled([
    users.listUsers({ role: 'EMPLOYEE' }),
    pathsApi.listPaths({ published: true }),
  ]);

  const teamUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
  const availablePaths = pathsResult.status === 'fulfilled' ? pathsResult.value : [];

  // Single bulk progress fetch — replaces the prior N+1 per-user pattern.
  // The endpoint caps at 200 ids and tolerates ids outside the caller's org.
  const teamUserIds = teamUsers.map((u) => u.id);
  let progressEntries: TeamProgressEntry[] = [];
  try {
    progressEntries = await progress.getTeamProgress(teamUserIds);
  } catch {
    // Fail open — table still renders with empty progress rather than blank.
    progressEntries = [];
  }

  const progressMap = new Map<string, TeamProgressEntry>(
    progressEntries.map((entry) => [entry.userId, entry]),
  );

  // Study-plan rows are an additive enhancement — failure to load shouldn't
  // hide the rest of the page, so we degrade to an empty card.
  const studyPlanRows = await ssrGet<TeamStudyPlanResponse>('/admin/study-plan/team')
    .then((r) => r.rows)
    .catch(() => [] as TeamStudyPlanResponse['rows']);

  const totalCount = teamUsers.length;

  return (
    <div className="mx-auto max-w-content space-y-8 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <MonoLabel>MANAGER VIEW</MonoLabel>
          <h1 className="font-serif text-display-md italic text-paper-100">Your team</h1>
          <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            {totalCount} DIRECT REPORT{totalCount !== 1 ? 'S' : ''}
          </p>
        </div>
      </header>

      {/* Filter pills (client) */}
      <TeamFilterPills activeFilter={activeFilter} />

      {/* Team table (server + client interactivity via SuggestPathDialog) */}
      <TeamTable
        users={teamUsers}
        progressMap={progressMap}
        availablePaths={availablePaths}
        activeFilter={activeFilter}
      />

      {/* Study plans (manager view) */}
      <TeamStudyPlansCard rows={studyPlanRows} />

      {/* Coaching suggestions */}
      <CoachingSuggestions users={teamUsers} progressMap={progressMap} />
    </div>
  );
}
