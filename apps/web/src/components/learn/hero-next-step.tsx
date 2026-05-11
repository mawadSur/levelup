import Link from 'next/link';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import type { CurriculumMap, CurriculumPathCard } from '@/lib/api/paths';

interface HeroNextStepProps {
  curriculum: CurriculumMap | null;
  hasCompletedAssessment: boolean;
}

/**
 * The singular "what's next" hero at the top of /learn.
 *
 * Decision order (first match wins):
 *   1. Baseline assessment pending  → "Take the 5-minute baseline."
 *   2. Path in progress (0 < completion < 1) → "Resume X (Y of Z lessons)."
 *   3. Core path unlocked & not started → "Start X."
 *   4. Any unlocked path not started → "Try X."
 *   5. Everything done → graduation message + link to curriculum map.
 *
 * Designed so the answer to "what do I do right now?" is always one click.
 */
export function HeroNextStep({ curriculum, hasCompletedAssessment }: HeroNextStepProps) {
  if (!hasCompletedAssessment) {
    return (
      <Card data-onboarding="next-step" className="border-signal/40 bg-signal/5">
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <MonoLabel tone="signal">NEXT STEP</MonoLabel>
            <p className="font-serif text-h2 italic text-paper-100">Take the 5-minute baseline.</p>
            <p className="max-w-reading text-body-sm text-paper-300">
              Your AI starting point — so we can recommend the right path for your role at Kapitus.
            </p>
          </div>
          <Link
            href="/assessment"
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-sm bg-signal px-5 font-sans text-body-sm font-semibold text-ink-900 transition-colors hover:bg-paper-100"
          >
            Start baseline
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!curriculum) {
    return null;
  }

  const allCards: CurriculumPathCard[] = curriculum.tiers.flatMap((t) => t.paths);

  // 2. Resume an in-progress path.
  const inProgress = allCards
    .filter((c) => c.completionRate > 0 && c.completionRate < 1)
    .sort((a, b) => b.completionRate - a.completionRate)[0];

  if (inProgress) {
    return (
      <NextStepCard
        eyebrow="CONTINUE"
        title={`Resume ${inProgress.title}.`}
        body={`${inProgress.completedLessons} of ${inProgress.lessonCount} lessons complete.`}
        ctaLabel="Pick up where you left off"
        ctaHref={`/learn/${inProgress.slug}`}
        icon={<ArrowRight className="h-4 w-4" aria-hidden />}
      />
    );
  }

  // 3. Next core path that's unlocked.
  const nextCore = allCards.find((c) => c.isCore && c.isUnlocked && !c.isComplete);
  if (nextCore) {
    return (
      <NextStepCard
        eyebrow="CORE PATH"
        title={`Start ${nextCore.title}.`}
        body={
          nextCore.description ??
          `${nextCore.lessonCount} lessons. Required for every Kapitus employee.`
        }
        ctaLabel="Begin the path"
        ctaHref={`/learn/${nextCore.slug}`}
        icon={<ArrowRight className="h-4 w-4" aria-hidden />}
      />
    );
  }

  // 4. Any unlocked role path not yet started.
  const nextElective = allCards.find(
    (c) => c.isUnlocked && !c.isComplete && c.completionRate === 0,
  );
  if (nextElective) {
    return (
      <NextStepCard
        eyebrow="RECOMMENDED"
        title={`Try ${nextElective.title}.`}
        body={
          nextElective.description ?? `${nextElective.lessonCount} lessons. Picked for your tier.`
        }
        ctaLabel="Explore the path"
        ctaHref={`/learn/${nextElective.slug}`}
        icon={<ArrowRight className="h-4 w-4" aria-hidden />}
      />
    );
  }

  // 4b. Everything unlocked is blocked. Show what would unlock next.
  const lockedWithProgress = allCards
    .filter((c) => !c.isUnlocked && c.blockingPrereqs.length > 0)
    .sort((a, b) => a.blockingPrereqs.length - b.blockingPrereqs.length)[0];

  if (lockedWithProgress) {
    return (
      <NextStepCard
        eyebrow="UNLOCK NEXT"
        title={`Almost there: finish ${lockedWithProgress.blockingPrereqs[0]} to unlock ${lockedWithProgress.title}.`}
        body={`${lockedWithProgress.blockingPrereqs.length} prerequisite${lockedWithProgress.blockingPrereqs.length === 1 ? '' : 's'} remaining.`}
        ctaLabel="Open the curriculum map"
        ctaHref="/curriculum"
        icon={<Lock className="h-4 w-4" aria-hidden />}
      />
    );
  }

  // 5. Graduated.
  return (
    <NextStepCard
      eyebrow="GRADUATED"
      title={`You've completed every path in the ${curriculum.user.tierLabel} tier.`}
      body="Coach a teammate. Open the curriculum map to share what you've learned."
      ctaLabel="View the curriculum"
      ctaHref="/curriculum"
      icon={<Sparkles className="h-4 w-4" aria-hidden />}
    />
  );
}

interface NextStepCardProps {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  icon: React.ReactNode;
}

function NextStepCard({ eyebrow, title, body, ctaLabel, ctaHref, icon }: NextStepCardProps) {
  return (
    <Card data-onboarding="next-step" className="border-signal/40 bg-signal/5">
      <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <MonoLabel tone="signal">{eyebrow}</MonoLabel>
          <p className="font-serif text-h2 italic text-paper-100">{title}</p>
          <p className="max-w-reading text-body-sm text-paper-300">{body}</p>
        </div>
        <Link
          href={ctaHref}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-sm bg-signal px-5 font-sans text-body-sm font-semibold text-ink-900 transition-colors hover:bg-paper-100"
        >
          {ctaLabel}
          {icon}
        </Link>
      </CardContent>
    </Card>
  );
}
