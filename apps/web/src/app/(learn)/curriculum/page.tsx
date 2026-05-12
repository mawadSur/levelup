import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check, Lock, Star } from 'lucide-react';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import { paths } from '@/lib/api';
import type { CurriculumPathCard, CurriculumTier } from '@/lib/api/paths';
import { ApiError } from '@/lib/api/errors';

export const metadata: Metadata = {
  title: 'Curriculum',
};

export default async function CurriculumPage() {
  let map: Awaited<ReturnType<typeof paths.getCurriculumMap>> | null = null;
  let loadError: ApiError | null = null;
  try {
    map = await paths.getCurriculumMap();
  } catch (err) {
    if (err instanceof ApiError) {
      loadError = err;
    } else {
      // Anything not an ApiError (e.g. Next's redirect signal) must propagate.
      throw err;
    }
  }
  if (loadError?.isAuthRequired) {
    redirect('/sign-in?redirect=%2Fcurriculum');
  }

  return (
    <div className="mx-auto max-w-content space-y-10 px-6 py-10">
      <header className="space-y-3">
        <MonoLabel>KAPITUS AI ACADEMY · CURRICULUM</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">
          From zero to hero, step by step.
        </h1>
        <p className="max-w-reading text-body-lg text-paper-300">
          Every Kapitus employee walks the same journey — starting at Apprentice, working through
          role electives, and graduating as a Hero who coaches the next cohort.
        </p>
        {map && (
          <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
            YOUR CURRENT TIER · {map.user.tierLabel.toUpperCase()}
          </p>
        )}
      </header>

      {!map ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-body-sm text-paper-300">
              Curriculum map unavailable. Please refresh or check back shortly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          {map.tiers.map((tier, idx) => (
            <TierColumn key={tier.key} tier={tier} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function TierColumn({ tier, index }: { tier: CurriculumTier; index: number }) {
  const numeral = String(index + 1).padStart(2, '0');
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-mono-sm uppercase tracking-[0.1em] text-signal">
          TIER {numeral}
        </span>
        <h2 className="font-serif text-h1 italic text-paper-100">{tier.label}</h2>
      </div>
      <p className="max-w-reading text-body-sm text-paper-300">{tier.tagline}</p>

      {tier.paths.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              MORE PATHS COMING SOON
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tier.paths.map((path) => (
            <PathTile key={path.id} path={path} />
          ))}
        </div>
      )}
    </section>
  );
}

function PathTile({ path }: { path: CurriculumPathCard }) {
  const { isUnlocked, isComplete, completedLessons, lessonCount, isCore, blockingPrereqs } = path;

  const tone = !isUnlocked
    ? 'locked'
    : isComplete
      ? 'complete'
      : completedLessons > 0
        ? 'in-progress'
        : 'available';

  const Wrapper: React.ElementType = isUnlocked ? Link : 'div';
  const wrapperProps = isUnlocked
    ? { href: `/learn/${path.slug}` }
    : { 'aria-disabled': true as const };

  return (
    <Wrapper
      {...wrapperProps}
      className={`group block rounded-md border bg-ink-800 p-5 transition-colors ${
        tone === 'locked'
          ? 'cursor-not-allowed border-ink-700 opacity-60'
          : 'border-ink-700 hover:border-signal/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isCore && <Star className="h-3.5 w-3.5 text-signal" aria-hidden />}
          <MonoLabel tone={isCore ? 'signal' : undefined}>
            {isCore ? 'CORE PATH' : 'ELECTIVE'}
          </MonoLabel>
        </div>
        <StatusBadge tone={tone} />
      </div>

      <h3 className="mt-4 font-serif text-h3 italic text-paper-100">{path.title}</h3>
      {path.description && <p className="mt-2 text-body-sm text-paper-300">{path.description}</p>}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          <span>
            {completedLessons} / {lessonCount} lessons
          </span>
          <span>{Math.round(path.completionRate * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full bg-signal transition-all"
            style={{ width: `${Math.round(path.completionRate * 100)}%` }}
          />
        </div>
      </div>

      {!isUnlocked && blockingPrereqs.length > 0 && (
        <p className="mt-4 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          UNLOCKS AFTER · {blockingPrereqs.join(' · ')}
        </p>
      )}
    </Wrapper>
  );
}

function StatusBadge({ tone }: { tone: 'locked' | 'complete' | 'in-progress' | 'available' }) {
  if (tone === 'locked') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-ink-700 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        <Lock className="h-3 w-3" aria-hidden /> Locked
      </span>
    );
  }
  if (tone === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-signal/15 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
        <Check className="h-3 w-3" aria-hidden /> Done
      </span>
    );
  }
  if (tone === 'in-progress') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-signal/40 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-ink-700 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
      Open
    </span>
  );
}
