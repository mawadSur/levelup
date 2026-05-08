import type { Metadata } from 'next';
import { game } from '@/lib/api';
import { getSessionUser } from '@/lib/auth-client';
import { LeaderboardTable } from '@/components/learn/leaderboard/leaderboard-table';
import { ScopeToggle } from '@/components/learn/leaderboard/scope-toggle';
import type { LeaderboardPeriod, LeaderboardScope } from '@levelup/types';

export const metadata: Metadata = {
  title: 'Leaderboard — LevelUp AI Academy',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const VALID_PERIODS = new Set<string>(['week', 'month', 'all']);
const VALID_SCOPES = new Set<string>(['org', 'department', 'me']);

function safePeriod(raw: string | undefined): LeaderboardPeriod {
  if (raw && VALID_PERIODS.has(raw)) return raw as LeaderboardPeriod;
  return 'week';
}

function safeScope(raw: string | undefined): LeaderboardScope {
  if (raw && VALID_SCOPES.has(raw)) return raw as LeaderboardScope;
  return 'org';
}

function periodLabel(period: LeaderboardPeriod): string {
  if (period === 'week') return 'this week';
  if (period === 'month') return 'this month';
  return 'all time';
}

function scopeLabel(scope: LeaderboardScope): string {
  if (scope === 'department') return 'in your department';
  return 'across the org';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const rawScope = Array.isArray(params.scope) ? params.scope[0] : params.scope;
  const rawPeriod = Array.isArray(params.period) ? params.period[0] : params.period;
  const rawDeptId = Array.isArray(params.departmentId)
    ? params.departmentId[0]
    : params.departmentId;

  const scope = safeScope(rawScope);
  const period = safePeriod(rawPeriod);

  const [sessionResult, leaderboardResult] = await Promise.allSettled([
    getSessionUser(),
    game.getLeaderboard({
      scope,
      period,
      ...(rawDeptId ? { departmentId: rawDeptId } : {}),
    }),
  ]);

  const session = sessionResult.status === 'fulfilled' ? sessionResult.value : null;
  const leaderboard = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : null;

  const entries = leaderboard?.entries ?? [];
  const failed = leaderboardResult.status === 'rejected';

  // Does the user have a department? Check if any entry for the user has a departmentName.
  const userEntry = session ? entries.find((e) => e.userId === session.userId) : null;
  const hasDepartment = userEntry?.departmentName != null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-serif text-5xl font-bold tracking-tight text-paper-100">Leaderboard</h1>
        <p className="text-base text-paper-300">
          Top XP earners {periodLabel(period)}, {scopeLabel(scope)}.
        </p>
      </div>

      {/* Scope / period toggles (client component) */}
      <ScopeToggle currentPeriod={period} currentScope={scope} hasDepartment={hasDepartment} />

      {/* Content */}
      {failed ? (
        <div className="rounded-xl border border-dashed border-ink-600 p-10 text-center">
          <p className="font-serif text-lg text-paper-300">Leaderboard coming soon.</p>
          <p className="mt-1 text-sm text-paper-300">
            We&apos;re still tallying results — check back shortly.
          </p>
        </div>
      ) : (
        <LeaderboardTable entries={entries} highlightUserId={session?.userId} />
      )}
    </div>
  );
}
