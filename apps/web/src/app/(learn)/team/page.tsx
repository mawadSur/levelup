import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-client';
import { users, paths as pathsApi, progress } from '@/lib/api';
import { TeamTable } from '@/components/learn/team/team-table';
import { CoachingSuggestions } from '@/components/learn/team/coaching-suggestions';
import { TeamFilterPills } from '@/components/learn/team/team-filter-pills';
import type { TeamProgressEntry } from '@/lib/api/progress';

export const metadata: Metadata = {
  title: 'Your Team — LevelUp AI Academy',
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

  const totalCount = teamUsers.length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-paper-100">Your team</h1>
          <p className="mt-1 text-paper-300">
            {totalCount} direct report{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter pills (client) */}
      <TeamFilterPills activeFilter={activeFilter} />

      {/* Team table (server + client interactivity via SuggestPathDialog) */}
      <TeamTable
        users={teamUsers}
        progressMap={progressMap}
        availablePaths={availablePaths}
        activeFilter={activeFilter}
      />

      {/* Coaching suggestions */}
      <CoachingSuggestions users={teamUsers} progressMap={progressMap} />
    </div>
  );
}
