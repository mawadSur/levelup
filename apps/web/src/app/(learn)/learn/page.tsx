import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, Badge, Button, MissionNumber, NumberedSection } from '@levelup/ui';
import { paths, progress, assessments, auth, game, nudges } from '@/lib/api';
import type { MyPathProgress } from '@/lib/api/progress';
import type { CoachNudge } from '@/lib/api/nudges';
import { DailyQuestPanel } from '@/components/learn/quests/daily-quest-panel';
import { StreakCallout } from '@/components/learn/quests/streak-callout';
import { HeroNextStep } from '@/components/learn/hero-next-step';
import { NewsStream } from '@/components/learn/news-stream';
import { CoachNudgeStrip } from '@/components/learn/coach-nudge-strip';
import { fetchDailyNews } from '@/lib/news/fetch-news';
import type { DailyQuestItem, CurrentWeekResponse } from '@levelup/types';
import type { CurriculumMap } from '@/lib/api/paths';
import { ssrGet } from '@/lib/api/server-fetch';
import { getSessionUser } from '@/lib/auth-client';
import { StudyPlanStrip } from '@/components/learn/study-plan-strip';

export const metadata: Metadata = {
  title: 'Learn',
};

/**
 * Pick a personal-feeling first name for the hero greeting. Prefers the first
 * token of `name`. Falls back to a capitalized email local-part so users with
 * incomplete profiles (Supabase signup without firstName, magic-link users)
 * still see their own name rather than a generic "learner".
 */
function resolveFirstName(name: string | undefined, email: string | undefined): string {
  if (typeof name === 'string') {
    const trimmed = name.trim();
    if (trimmed !== '' && !trimmed.includes('@')) {
      const firstToken = trimmed.split(/\s+/)[0];
      if (firstToken !== undefined && firstToken !== '') return firstToken;
    }
  }
  if (typeof email === 'string' && email.includes('@')) {
    const localPart = email.split('@')[0] ?? '';
    // Email local-parts often use `.` or `_` to separate name parts (e.g.
    // `mawad.al-saadi@…` → "Mawad"). Take the first segment and title-case it.
    const segment = localPart.split(/[._-]/)[0] ?? localPart;
    if (segment.length > 0) {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  }
  return 'there';
}

export default async function LearnPage() {
  const [
    progressData,
    meData,
    allPathsData,
    assessmentData,
    gameStateData,
    questsData,
    curriculumData,
    newsItems,
    nudgeItems,
  ] = await Promise.all([
    progress.getMyProgress().catch(() => [] as MyPathProgress[]),
    auth.me().catch(() => null),
    paths
      .listPaths({ published: true })
      .catch(() => [] as Awaited<ReturnType<typeof paths.listPaths>>),
    assessments.listMyAssessments().catch(() => []),
    game.getGameState().catch(() => null),
    game.getTodayQuests().catch(() => ({ quests: [] as DailyQuestItem[] })),
    paths.getCurriculumMap().catch(() => null as CurriculumMap | null),
    fetchDailyNews(),
    nudges.listMyActive().catch(() => [] as CoachNudge[]),
  ]);

  // Current-week StudyPlan — fetched server-side via ssrGet because the
  // public api client doesn't carry the SSR auth header. Falls open on any
  // failure so the page still renders without the strip.
  const studyPlanCurrent = await ssrGet<CurrentWeekResponse>('/study-plan/me/current-week').catch(
    () => ({ plan: null }) as CurrentWeekResponse,
  );

  const myPathProgress = progressData;
  const me = meData;
  const allPaths = allPathsData;
  const myAssessments = assessmentData;
  const gameState = gameStateData;
  const initialQuests = questsData.quests;
  const curriculum = curriculumData;

  const hasCompletedAssessment = myAssessments.length > 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = myPathProgress.reduce((sum, pp) => {
    if (!pp.lastActivityAt) return sum;
    if (new Date(pp.lastActivityAt) < startOfMonth) return sum;
    return sum + pp.lessonsCompleted;
  }, 0);

  type PathWithProgress = (typeof allPaths)[number] & {
    completedLessons?: number;
    completionRate?: number;
    isAssigned?: boolean;
  };
  const pathsWithProgress = allPaths as PathWithProgress[];
  const assignedPaths = pathsWithProgress.filter((p) => p.isAssigned !== false);

  // Prefer `me` (full auth.me() shape with aiLevel etc), but fall back to
  // getSessionUser — the same helper the (learn) layout uses to gate access,
  // which has independent error handling. If auth.me() throws (e.g. the
  // schema in @levelup/types is stricter than the API payload), we still
  // greet the user by name.
  const sessionUser = me === null ? await getSessionUser() : null;
  const firstName = resolveFirstName(
    me?.name ?? sessionUser?.name,
    me?.email ?? sessionUser?.email,
  );

  // The one path to resume — prefer in-progress over not-started.
  const continueTarget =
    assignedPaths.find((p) => (p.completionRate ?? 0) > 0 && (p.completionRate ?? 0) < 100) ??
    assignedPaths.find((p) => (p.completionRate ?? 0) < 100) ??
    null;

  // Streak callout data
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const completedTodayCount = myPathProgress.filter((pp) => {
    if (!pp.lastActivityAt) return false;
    return new Date(pp.lastActivityAt) >= startOfToday;
  }).length;
  const earnedToday = completedTodayCount > 0 ? 1 : 0;

  const firstInProgressPath = assignedPaths.find((p) => (p.completionRate ?? 0) < 100);
  const nextLessonHref = firstInProgressPath ? `/learn/${firstInProgressPath.slug}` : '/learn';

  const currentStreak = gameState?.currentStreak ?? 0;
  const totalXp = gameState?.xp ?? 0;
  const level = gameState?.level ?? 1;

  // Counter index drives the section numerals: we skip numerals for empty
  // sections so the visible order reads 01, 02, 03 rather than 01, 03, 05.
  let stepIndex = 0;
  const nextStep = () => String(++stepIndex).padStart(2, '0');

  return (
    <div className="mx-auto max-w-content space-y-12 px-6 py-10">
      {/* Onboarding hand-holding for first-time learners. */}
      <HeroNextStep curriculum={curriculum} hasCompletedAssessment={hasCompletedAssessment} />

      {/* Hero greeting */}
      <header className="animate-mission-in space-y-3">
        <h1 className="font-serif text-display-md italic text-paper-100">Hi, {firstName}.</h1>
        <p className="max-w-reading text-body-lg text-paper-300">
          {completedThisMonth > 0 ? (
            <>
              <MissionNumber value={completedThisMonth} className="text-paper-100" /> lesson
              {completedThisMonth !== 1 ? 's' : ''} completed this month.
            </>
          ) : (
            'No lessons completed this month yet — pick up below.'
          )}
        </p>

        {/* Quick stats strip — level, XP, streak. Always visible, always reliable. */}
        <div className="flex flex-wrap items-center gap-3 pt-3">
          <StatChip label="LEVEL" value={`${level}`} />
          <StatChip label="XP" value={totalXp.toLocaleString()} />
          <StatChip
            label="STREAK"
            value={`${currentStreak} ${currentStreak === 1 ? 'DAY' : 'DAYS'}`}
          />
        </div>
      </header>

      {/* "Your Week" StudyPlan checklist — top-of-page above Continue Learning.
          Renders nothing when the user has no current-week plan. */}
      {studyPlanCurrent.plan ? <StudyPlanStrip initialCurrent={studyPlanCurrent.plan} /> : null}

      {/* Continue learning hero card */}
      {continueTarget && (
        <NumberedSection numeral={nextStep()} eyebrow="CONTINUE LEARNING">
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="signal">IN PROGRESS</Badge>
                  {continueTarget.targetRole && (
                    <Badge variant="default">{continueTarget.targetRole}</Badge>
                  )}
                </div>
                <p className="font-serif text-h2 italic text-paper-100">{continueTarget.title}</p>
                <div className="pt-2">
                  <div className="mb-1.5 flex items-center justify-between font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    <span>
                      {continueTarget.completedLessons ?? 0} / {continueTarget.lessonCount} LESSONS
                    </span>
                    <span className="text-paper-100">
                      <MissionNumber
                        value={(continueTarget.completionRate ?? 0) / 100}
                        format="percent"
                      />
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-data bg-ink-700">
                    <div
                      className="h-full bg-signal transition-[width] duration-500 ease-mission"
                      style={{ width: `${continueTarget.completionRate ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <Button asChild variant="primary" size="lg" className="shrink-0">
                <Link href={`/learn/${continueTarget.slug}`}>Resume →</Link>
              </Button>
            </CardContent>
          </Card>
        </NumberedSection>
      )}

      {/* Coach Suggestions — proactive nudges generated daily by the worker.
          Hidden entirely when there are no active suggestions. */}
      {nudgeItems.length > 0 && (
        <NumberedSection numeral={nextStep()} eyebrow="COACH SUGGESTIONS" className="space-y-4">
          <CoachNudgeStrip initial={nudgeItems} />
        </NumberedSection>
      )}

      {/* Daily quest panel */}
      {initialQuests.length > 0 && (
        <NumberedSection numeral={nextStep()} eyebrow="DAILY QUESTS" className="space-y-4">
          <div data-onboarding="quests">
            <DailyQuestPanel initialQuests={initialQuests} />
          </div>
        </NumberedSection>
      )}

      {/* Daily AI briefing — curated stream that refreshes hourly via Next cache. */}
      {newsItems.length > 0 && (
        <NumberedSection numeral={nextStep()} eyebrow="DAILY AI BRIEFING" className="space-y-4">
          <p className="max-w-reading text-body text-paper-300">
            A daily pulse on what&apos;s shipping in AI — curated, refreshed every hour.
          </p>
          <NewsStream items={newsItems} />
        </NumberedSection>
      )}

      {/* Browse curriculum — replaces the in-page path grid. */}
      <NumberedSection numeral={nextStep()} eyebrow="EXPLORE THE CURRICULUM" className="space-y-3">
        <p className="max-w-reading text-body text-paper-300">
          Looking for what comes next, or want to browse the whole journey from beginner to
          champion? Open the curriculum map.
        </p>
        <Button asChild variant="secondary">
          <Link href="/curriculum">Browse the curriculum →</Link>
        </Button>
      </NumberedSection>

      <RecentAchievements pathProgress={myPathProgress} numeral={nextStep()} />

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

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      data-testid={`stat-chip-${label.toLowerCase()}`}
      className="flex items-center gap-2 rounded-data border border-ink-600 bg-ink-800/60 px-3 py-1.5"
    >
      <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        {label}
      </span>
      <span
        data-testid={`stat-chip-${label.toLowerCase()}-value`}
        className="font-mono text-mono-sm font-semibold text-paper-100"
      >
        {value}
      </span>
    </div>
  );
}

function RecentAchievements({
  pathProgress,
  numeral,
}: {
  pathProgress: MyPathProgress[];
  numeral: string;
}) {
  const totalCompleted = pathProgress.reduce((sum, pp) => sum + pp.lessonsCompleted, 0);
  if (totalCompleted === 0) return null;

  const milestones = [1, 5, 10, 25, 50, 100];
  const earned = milestones.filter((m) => totalCompleted >= m);

  if (earned.length === 0) return null;

  return (
    <NumberedSection numeral={numeral} eyebrow="RECENT ACHIEVEMENTS" className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {earned.map((milestone) => (
          <div
            key={milestone}
            className="flex items-center gap-2 rounded-data border border-signal-dim bg-ink-800 px-3 py-1.5"
          >
            <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
              {milestone === 1 ? 'FIRST LESSON' : `${milestone} LESSONS`}
            </span>
          </div>
        ))}
      </div>
    </NumberedSection>
  );
}
