import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, Badge, Button, Progress } from '@levelup/ui';
import { paths, progress, assessments, auth, game } from '@/lib/api';
import { PathCard } from '@/components/learn/path-card';
import type { PathCardData } from '@/components/learn/path-card';
import type { MyPathProgress } from '@/lib/api/progress';
import { DailyQuestPanel } from '@/components/learn/quests/daily-quest-panel';
import { StreakCallout } from '@/components/learn/quests/streak-callout';
import type { DailyQuestItem } from '@levelup/types';

export const metadata: Metadata = {
  title: 'Learn',
};

export default async function LearnPage() {
  // Fetch in parallel — gracefully degrade on error
  const [progressData, meData, allPathsData, assessmentData, gameStateData, questsData] =
    await Promise.allSettled([
      progress.getMyProgress(),
      auth.me(),
      paths.listPaths({ published: true }),
      assessments.listMyAssessments(),
      game.getGameState(),
      game.getTodayQuests(),
    ]);

  const myPathProgress: MyPathProgress[] =
    progressData.status === 'fulfilled' ? progressData.value : [];
  const me = meData.status === 'fulfilled' ? meData.value : null;
  const allPaths = allPathsData.status === 'fulfilled' ? allPathsData.value : [];
  const myAssessments = assessmentData.status === 'fulfilled' ? assessmentData.value : [];
  const gameState = gameStateData.status === 'fulfilled' ? gameStateData.value : null;
  const initialQuests: DailyQuestItem[] =
    questsData.status === 'fulfilled' ? questsData.value.quests : [];

  const hasCompletedAssessment = myAssessments.length > 0;

  // -----------------------------------------------------------------------
  // Per-path aggregates (CR.4 contract change)
  // `progress.getMyProgress()` now returns one row per assigned path with
  // lessonsTotal/lessonsCompleted/percentComplete/lastActivityAt. The page
  // no longer needs a per-lesson map.
  // -----------------------------------------------------------------------

  // Approximate "completed this month" using each path's lastActivityAt.
  // This is a UI heuristic — for an exact monthly count we'd need a
  // dedicated /users/me/activity?since= endpoint.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = myPathProgress.reduce((sum, pp) => {
    if (!pp.lastActivityAt) return sum;
    if (new Date(pp.lastActivityAt) < startOfMonth) return sum;
    return sum + pp.lessonsCompleted;
  }, 0);

  // The /learn hero used to highlight a single in-progress lesson; the
  // per-path summary surfaces enough data for the "Continue learning" card
  // without that lookup. We retain the variable name as null for parts of
  // the JSX that still reference it.
  const currentLesson: { lessonId: string } | null = null;

  // Find path that contains current lesson (via paths having the path context)
  // We look for a path whose lesson IDs include the currentLesson.lessonId.
  // Since listPaths doesn't return lesson IDs, we use a heuristic: find the
  // path with the most recently active progress by matching against allPaths.
  // For the hero card, we show the first in-progress path by title only.

  // Per-path data — cast allPaths; the server may return extra progress fields
  type PathWithProgress = (typeof allPaths)[number] & {
    completedLessons?: number;
    completionRate?: number;
    isAssigned?: boolean;
  };
  const pathsWithProgress = allPaths as PathWithProgress[];

  // Separate assigned vs unassigned paths
  const assignedPaths = pathsWithProgress.filter((p) => p.isAssigned !== false);
  const unassignedPaths = pathsWithProgress.filter((p) => p.isAssigned === false);

  // Recommended: unassigned paths matching the user's aiLevel (if available)
  // SessionUser from @levelup/types doesn't expose aiLevel; we check the raw
  // me() response which may include it as an extra field.
  const meExtended =
    meData.status === 'fulfilled'
      ? (meData.value as { id: string; name: string; email: string; aiLevel?: string })
      : null;
  const userAiLevel = meExtended?.aiLevel;

  const recommendedPaths = unassignedPaths
    .filter((p) => !userAiLevel || p.targetLevel === userAiLevel)
    .slice(0, 3) as PathWithProgress[];

  const firstName = me?.name?.split(' ')[0] ?? 'there';

  // Find any path that has an in-progress lesson for the "Continue learning" hero
  // Without per-lesson-to-path mapping, we show the first assigned path with <100% completion
  const continueTarget =
    assignedPaths.find((p) => (p.completionRate ?? 0) > 0 && (p.completionRate ?? 0) < 100) ?? null;

  // -----------------------------------------------------------------------
  // Streak callout data
  // -----------------------------------------------------------------------

  // earnedToday: We don't have an xpEvents endpoint exposed here, so we
  // approximate by checking whether any lesson was completed today.  If the
  // game state xp changed since yesterday that's not available either, so we
  // default to 0 (conservative — will show the callout if conditions are met).
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Approximate "completed today" using each path's last-activity stamp.
  // Same caveat as completedThisMonth — exact counts require a dedicated
  // /users/me/activity endpoint.
  const completedTodayCount = myPathProgress.filter((pp) => {
    if (!pp.lastActivityAt) return false;
    return new Date(pp.lastActivityAt) >= startOfToday;
  }).length;
  // Use lesson completions today as a proxy for earnedToday > 0
  const earnedToday = completedTodayCount > 0 ? 1 : 0;

  // nextLessonHref: first in-progress lesson in an assigned path, or the
  // first incomplete assigned path, falling back to /learn.
  const firstInProgressPath = assignedPaths.find((p) => (p.completionRate ?? 0) < 100);
  const nextLessonHref = firstInProgressPath ? `/learn/${firstInProgressPath.slug}` : '/learn';

  const currentStreak = gameState?.currentStreak ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      {/* Baseline assessment banner */}
      {!hasCompletedAssessment && (
        <Card data-onboarding="baseline-banner" className="border-signal/40 bg-signal/5">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-paper-100">Get a learning path tailored to you</p>
              <p className="mt-0.5 text-sm text-paper-300">
                Take the 5-minute baseline assessment to unlock your personalised AI learning
                journey.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/assessment">Start assessment</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Hero greeting */}
      <section aria-labelledby="hero-greeting">
        <h1 id="hero-greeting" className="text-3xl font-bold tracking-tight text-paper-100">
          Hi, {firstName}.
        </h1>
        <p className="mt-1 text-paper-300">
          {completedThisMonth > 0
            ? `${completedThisMonth} lesson${completedThisMonth !== 1 ? 's' : ''} completed this month.`
            : 'No lessons completed this month yet — time to get started!'}
        </p>
      </section>

      {/* Continue learning hero card */}
      {continueTarget && (
        <section aria-labelledby="continue-heading">
          <h2
            id="continue-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-paper-300"
          >
            Continue learning
          </h2>
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    In progress
                  </Badge>
                  {continueTarget.targetRole && (
                    <Badge variant="outline" className="text-xs">
                      {continueTarget.targetRole}
                    </Badge>
                  )}
                </div>
                <p className="text-lg font-semibold text-paper-100">{continueTarget.title}</p>
                {currentLesson && (
                  <p className="text-sm text-paper-300 truncate">Current lesson in progress</p>
                )}
                <div className="pt-1">
                  <div className="mb-1 flex justify-between text-xs text-paper-300">
                    <span>
                      {continueTarget.completedLessons ?? 0} / {continueTarget.lessonCount} lessons
                    </span>
                    <span>{Math.round(continueTarget.completionRate ?? 0)}%</span>
                  </div>
                  <Progress value={continueTarget.completionRate ?? 0} className="h-2" />
                </div>
              </div>
              <Button asChild size="lg" className="shrink-0">
                <Link href={`/learn/${continueTarget.slug}`}>Resume</Link>
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* Daily quest panel — between continue-learning and paths grid */}
      {initialQuests.length > 0 && (
        <div data-onboarding="quests">
          <DailyQuestPanel initialQuests={initialQuests} />
        </div>
      )}

      {/* Your paths grid */}
      {assignedPaths.length > 0 && (
        <section data-onboarding="paths" aria-labelledby="your-paths-heading">
          <h2
            id="your-paths-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wider text-paper-300"
          >
            Your paths
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignedPaths.map((path) => {
              const cardData: PathCardData = {
                id: path.id,
                title: path.title,
                slug: path.slug,
                description: path.description,
                targetRole: path.targetRole,
                targetLevel: path.targetLevel,
                coverImageUrl: path.coverImageUrl,
                lessonCount: path.lessonCount,
                estimatedMinutes: path.estimatedMinutes,
                completedLessons: path.completedLessons ?? 0,
                completionRate: path.completionRate ?? 0,
                isAssigned: true,
              };
              return <PathCard key={path.id} path={cardData} />;
            })}
          </div>
        </section>
      )}

      {/* Recommended for you */}
      {userAiLevel && recommendedPaths.length > 0 && (
        <section aria-labelledby="recommended-heading">
          <h2
            id="recommended-heading"
            className="mb-1 text-sm font-semibold uppercase tracking-wider text-paper-300"
          >
            Recommended for you
          </h2>
          <p className="mb-4 text-sm text-paper-300">
            Paths matched to your <span className="font-medium">{userAiLevel.toLowerCase()}</span>{' '}
            level — ask your manager to assign them.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendedPaths.map((path) => {
              const cardData: PathCardData = {
                id: path.id,
                title: path.title,
                slug: path.slug,
                description: path.description,
                targetRole: path.targetRole,
                targetLevel: path.targetLevel,
                coverImageUrl: path.coverImageUrl,
                lessonCount: path.lessonCount,
                estimatedMinutes: path.estimatedMinutes,
                isAssigned: false,
              };
              return <PathCard key={path.id} path={cardData} recommended />;
            })}
          </div>
        </section>
      )}

      {/* Recent achievements */}
      <RecentAchievements pathProgress={myPathProgress} />

      {/* Streak callout — shown at bottom when conditions are met (late/early, no XP, active streak) */}
      {currentStreak >= 1 && (
        <StreakCallout
          streak={currentStreak}
          earnedToday={earnedToday}
          nextLessonHref={nextLessonHref}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent achievements sub-component (server, same file for simplicity)
// ---------------------------------------------------------------------------
function RecentAchievements({ pathProgress }: { pathProgress: MyPathProgress[] }) {
  const totalCompleted = pathProgress.reduce((sum, pp) => sum + pp.lessonsCompleted, 0);
  if (totalCompleted === 0) return null;

  const milestones = [1, 5, 10, 25, 50, 100];
  const earned = milestones.filter((m) => totalCompleted >= m);

  if (earned.length === 0) return null;

  return (
    <section aria-labelledby="achievements-heading">
      <h2
        id="achievements-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-paper-300"
      >
        Recent achievements
      </h2>
      <div className="flex flex-wrap gap-3">
        {earned.map((milestone) => (
          <div
            key={milestone}
            className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-800 px-4 py-2"
          >
            <span className="text-lg" role="img" aria-label="badge">
              {milestone >= 50 ? '🏆' : milestone >= 10 ? '⭐' : '🎯'}
            </span>
            <span className="text-sm font-medium text-paper-100">
              {milestone === 1 ? 'First lesson!' : `${milestone} lessons`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
