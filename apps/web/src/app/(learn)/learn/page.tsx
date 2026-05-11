import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Card,
  CardContent,
  Badge,
  Button,
  MissionNumber,
  MonoLabel,
  NumberedSection,
} from '@levelup/ui';
import { paths, progress, assessments, auth, game } from '@/lib/api';
import { PathCard } from '@/components/learn/path-card';
import type { PathCardData } from '@/components/learn/path-card';
import type { MyPathProgress } from '@/lib/api/progress';
import { DailyQuestPanel } from '@/components/learn/quests/daily-quest-panel';
import { StreakCallout } from '@/components/learn/quests/streak-callout';
import { HeroNextStep } from '@/components/learn/hero-next-step';
import type { DailyQuestItem } from '@levelup/types';
import type { CurriculumMap } from '@/lib/api/paths';

export const metadata: Metadata = {
  title: 'Learn',
};

export default async function LearnPage() {
  const [
    progressData,
    meData,
    allPathsData,
    assessmentData,
    gameStateData,
    questsData,
    curriculumData,
  ] = await Promise.allSettled([
    progress.getMyProgress(),
    auth.me(),
    paths.listPaths({ published: true }),
    assessments.listMyAssessments(),
    game.getGameState(),
    game.getTodayQuests(),
    paths.getCurriculumMap(),
  ]);

  const curriculum: CurriculumMap | null =
    curriculumData.status === 'fulfilled' ? curriculumData.value : null;

  const myPathProgress: MyPathProgress[] =
    progressData.status === 'fulfilled' ? progressData.value : [];
  const me = meData.status === 'fulfilled' ? meData.value : null;
  const allPaths = allPathsData.status === 'fulfilled' ? allPathsData.value : [];
  const myAssessments = assessmentData.status === 'fulfilled' ? assessmentData.value : [];
  const gameState = gameStateData.status === 'fulfilled' ? gameStateData.value : null;
  const initialQuests: DailyQuestItem[] =
    questsData.status === 'fulfilled' ? questsData.value.quests : [];

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
  const unassignedPaths = pathsWithProgress.filter((p) => p.isAssigned === false);

  const meExtended =
    meData.status === 'fulfilled'
      ? (meData.value as { id: string; name: string; email: string; aiLevel?: string })
      : null;
  const userAiLevel = meExtended?.aiLevel;

  const recommendedPaths = unassignedPaths
    .filter((p) => !userAiLevel || p.targetLevel === userAiLevel)
    .slice(0, 3) as PathWithProgress[];

  const firstName = me?.name?.split(' ')[0] ?? 'learner';

  const continueTarget =
    assignedPaths.find((p) => (p.completionRate ?? 0) > 0 && (p.completionRate ?? 0) < 100) ?? null;

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

  return (
    <div className="mx-auto max-w-content space-y-12 px-6 py-10">
      {/* The one CTA we want every learner to see first. */}
      <HeroNextStep curriculum={curriculum} hasCompletedAssessment={hasCompletedAssessment} />

      {/* Hero greeting */}
      <header className="animate-mission-in space-y-3">
        <MonoLabel>YOUR LEARNING</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Hi, {firstName}.</h1>
        <p className="max-w-reading text-body-lg text-paper-300">
          {completedThisMonth > 0 ? (
            <>
              <MissionNumber value={completedThisMonth} className="text-paper-100" /> lesson
              {completedThisMonth !== 1 ? 's' : ''} completed this month.
            </>
          ) : (
            'No lessons completed this month yet — time to begin.'
          )}
        </p>
      </header>

      {/* Continue learning hero card */}
      {continueTarget && (
        <NumberedSection numeral="01" eyebrow="CONTINUE LEARNING">
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

      {/* Daily quest panel */}
      {initialQuests.length > 0 && (
        <NumberedSection numeral="02" eyebrow="DAILY QUESTS" className="space-y-4">
          <div data-onboarding="quests">
            <DailyQuestPanel initialQuests={initialQuests} />
          </div>
        </NumberedSection>
      )}

      {/* Your paths grid */}
      {assignedPaths.length > 0 && (
        <NumberedSection
          numeral={initialQuests.length > 0 ? '03' : '02'}
          eyebrow="YOUR PATHS"
          className="space-y-4"
        >
          <div data-onboarding="paths" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </NumberedSection>
      )}

      {/* Recommended for you */}
      {userAiLevel && recommendedPaths.length > 0 && (
        <NumberedSection numeral="04" eyebrow="RECOMMENDED" className="space-y-4">
          <p className="max-w-reading text-body text-paper-300">
            Matched to your{' '}
            <span className="font-mono uppercase tracking-[0.05em] text-signal">
              {userAiLevel.toUpperCase()}
            </span>{' '}
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
        </NumberedSection>
      )}

      <RecentAchievements pathProgress={myPathProgress} />

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
function RecentAchievements({ pathProgress }: { pathProgress: MyPathProgress[] }) {
  const totalCompleted = pathProgress.reduce((sum, pp) => sum + pp.lessonsCompleted, 0);
  if (totalCompleted === 0) return null;

  const milestones = [1, 5, 10, 25, 50, 100];
  const earned = milestones.filter((m) => totalCompleted >= m);

  if (earned.length === 0) return null;

  return (
    <NumberedSection numeral="05" eyebrow="RECENT ACHIEVEMENTS" className="space-y-4">
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
