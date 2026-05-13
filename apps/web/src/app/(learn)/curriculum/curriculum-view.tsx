'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FlaskConical,
  Lock,
  VenetianMask,
  ChevronDown,
  ChevronUp,
  Flame,
  Check,
  Star,
} from 'lucide-react';
import {
  cn,
  MonoLabel,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@levelup/ui';
import type {
  CurriculumMe,
  CurriculumPathNode,
  CurriculumTierNode,
  CurriculumLessonNode,
  CurriculumLessonKind,
  CurriculumLessonStatus,
} from '@/lib/api/curriculum';

interface CurriculumViewProps {
  data: CurriculumMe;
}

export function CurriculumView({ data }: CurriculumViewProps) {
  const { tiers, gameState, meta } = data;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-10">
        <GameStateStrip gameState={gameState} />
        <div className="space-y-6">
          {tiers.map((tier, idx) => (
            <TierLane key={tier.tier} tier={tier} index={idx} prereqTitles={meta.prereqTitles} />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Top strip — level, XP bar, streak
// ---------------------------------------------------------------------------

function GameStateStrip({ gameState }: { gameState: CurriculumMe['gameState'] }) {
  const { level, xpAtCurrentLevel, xpForNextLevel, currentStreak, longestStreak } = gameState;
  const pct = xpForNextLevel > 0 ? Math.min(100, (xpAtCurrentLevel / xpForNextLevel) * 100) : 0;

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-800 p-5" data-testid="game-state-strip">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-signal font-serif text-h2 italic font-semibold text-ink-900"
            data-testid="game-state-level"
          >
            {level}
          </span>
          <div>
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              Current level
            </p>
            <p className="font-serif text-h3 italic text-paper-100">Level {level}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1 sm:px-8">
          <div className="mb-1.5 flex items-center justify-between font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            <span>XP progress</span>
            <span>
              {xpAtCurrentLevel} / {xpForNextLevel}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full bg-signal transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame
              className={cn('h-5 w-5', currentStreak > 0 ? 'text-signal' : 'text-paper-500')}
              aria-hidden
            />
            <div>
              <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Current streak
              </p>
              <p className="font-serif text-h3 italic text-paper-100">
                {currentStreak} day{currentStreak === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="hidden md:block">
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              Longest
            </p>
            <p className="font-serif text-h3 italic text-paper-100">{longestStreak}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier swim-lane
// ---------------------------------------------------------------------------

function TierLane({
  tier,
  index,
  prereqTitles,
}: {
  tier: CurriculumTierNode;
  index: number;
  prereqTitles: Record<string, string>;
}) {
  // Mobile: collapsible. Desktop: always expanded. We render both states and
  // toggle on small viewports only.
  const [open, setOpen] = useState(index === 0);
  const numeral = String(index + 1).padStart(2, '0');

  return (
    <section
      className="rounded-lg border border-ink-700 bg-ink-900/40"
      data-testid="curriculum-tier"
      data-tier={tier.tier}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left md:cursor-default"
        aria-expanded={open}
      >
        <div className="flex flex-col gap-1">
          <span className="font-mono text-mono-sm uppercase tracking-[0.1em] text-signal">
            TIER {numeral}
          </span>
          <h2 className="font-serif text-h1 italic text-paper-100">{tier.label}</h2>
          <p className="text-body-sm text-paper-300">{tier.tagline}</p>
        </div>
        <span className="md:hidden">
          {open ? (
            <ChevronUp className="h-5 w-5 text-paper-300" aria-hidden />
          ) : (
            <ChevronDown className="h-5 w-5 text-paper-300" aria-hidden />
          )}
        </span>
      </button>

      <div className={cn('px-5 pb-5', open ? 'block' : 'hidden md:block')}>
        {tier.paths.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink-700 p-6 text-center">
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              MORE PATHS COMING SOON
            </p>
          </div>
        ) : (
          <div
            className={cn(
              // Desktop: horizontal scroll swim-lane. Mobile: vertical stack.
              'flex flex-col gap-4',
              'md:flex-row md:flex-nowrap md:gap-4 md:overflow-x-auto md:pb-2',
            )}
          >
            {tier.paths.map((path) => (
              <PathCard key={path.id} path={path} prereqTitles={prereqTitles} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Path card with lesson flow visualization
// ---------------------------------------------------------------------------

function PathCard({
  path,
  prereqTitles,
}: {
  path: CurriculumPathNode;
  prereqTitles: Record<string, string>;
}) {
  const { isUnlocked, isComplete, progress, blockingPrereqs, isCore } = path;
  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const blockingTitles = blockingPrereqs.map((slug) => prereqTitles[slug] ?? slug);

  return (
    <article
      className={cn(
        'rounded-md border bg-ink-800 p-5 transition-colors md:w-[28rem] md:flex-shrink-0',
        isUnlocked ? 'border-ink-700 hover:border-signal/50' : 'border-ink-700 opacity-70',
      )}
      data-testid="path-card"
      data-path-slug={path.slug}
      data-unlocked={isUnlocked ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isCore && <Star className="h-3.5 w-3.5 text-signal" aria-hidden />}
          <MonoLabel tone={isCore ? 'signal' : undefined}>
            {isCore ? 'CORE PATH' : 'ELECTIVE'}
          </MonoLabel>
        </div>
        <PathStatusBadge
          isUnlocked={isUnlocked}
          isComplete={isComplete}
          inProgress={progress.completed > 0 && !isComplete}
        />
      </div>

      <h3 className="mt-3 font-serif text-h3 italic text-paper-100">{path.title}</h3>
      {path.description && (
        <p className="mt-1 line-clamp-2 text-body-sm text-paper-300">{path.description}</p>
      )}

      <div className="mt-4">
        <LessonFlow
          lessons={path.lessons}
          pathSlug={path.slug}
          isUnlocked={isUnlocked}
          blockingTitles={blockingTitles}
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          <span>
            {progress.completed} / {progress.total} lessons
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-ink-700">
          <div className="h-full bg-signal transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {!isUnlocked && blockingTitles.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>COMPLETE {blockingTitles.join(' · ')} FIRST</span>
        </p>
      )}
    </article>
  );
}

function PathStatusBadge({
  isUnlocked,
  isComplete,
  inProgress,
}: {
  isUnlocked: boolean;
  isComplete: boolean;
  inProgress: boolean;
}) {
  if (!isUnlocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-ink-700 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        <Lock className="h-3 w-3" aria-hidden /> Locked
      </span>
    );
  }
  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-signal/15 px-2 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
        <Check className="h-3 w-3" aria-hidden /> Done
      </span>
    );
  }
  if (inProgress) {
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

// ---------------------------------------------------------------------------
// Lesson flow — sequence of kind-styled nodes
// ---------------------------------------------------------------------------

function LessonFlow({
  lessons,
  pathSlug,
  isUnlocked,
  blockingTitles,
}: {
  lessons: CurriculumLessonNode[];
  pathSlug: string;
  isUnlocked: boolean;
  blockingTitles: string[];
}) {
  if (lessons.length === 0) {
    return (
      <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        NO LESSONS YET
      </p>
    );
  }

  return (
    <div
      className="-mx-1 flex flex-wrap items-center gap-y-3 md:flex-nowrap md:overflow-x-auto md:pb-1"
      data-testid="lesson-flow"
    >
      {lessons.map((lesson, idx) => (
        <div key={lesson.id} className="flex items-center">
          <LessonNode
            lesson={lesson}
            pathSlug={pathSlug}
            isUnlocked={isUnlocked}
            blockingTitles={blockingTitles}
          />
          {idx < lessons.length - 1 && (
            <span
              className={cn(
                'mx-1 h-px w-3 md:w-4',
                lesson.status === 'COMPLETED' ? 'bg-signal/60' : 'bg-ink-700',
              )}
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  );
}

const KIND_META: Record<
  CurriculumLessonKind,
  { label: string; Icon: typeof BookOpen; size: 'sm' | 'md' }
> = {
  READ: { label: 'Read', Icon: BookOpen, size: 'sm' },
  LAB: { label: 'Lab · Checkpoint', Icon: FlaskConical, size: 'md' },
  SCENARIO: { label: 'Scenario', Icon: VenetianMask, size: 'sm' },
};

function LessonNode({
  lesson,
  pathSlug,
  isUnlocked,
  blockingTitles,
}: {
  lesson: CurriculumLessonNode;
  pathSlug: string;
  isUnlocked: boolean;
  blockingTitles: string[];
}) {
  const meta = KIND_META[lesson.kind];
  const Icon = meta.Icon;
  const sizeClass = meta.size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  const iconSize = meta.size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  const kindRing = lessonKindRing(lesson.kind);
  const status = lesson.status;

  const stateClass = buildLessonStateClass({
    status,
    kind: lesson.kind,
    isUnlocked,
  });

  const labelText = isUnlocked
    ? `${meta.label} · ${lesson.title} · ${formatStatus(status)}`
    : `${meta.label} · ${lesson.title} · Locked: complete ${blockingTitles.join(', ')} first.`;

  const node = (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-full border transition-all',
        sizeClass,
        stateClass,
        meta.size === 'md' && 'ring-1',
        meta.size === 'md' && kindRing,
      )}
      aria-label={labelText}
    >
      <Icon className={cn(iconSize, 'shrink-0')} aria-hidden />
      {!isUnlocked && (
        <Lock
          className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-ink-900 p-0.5 text-paper-300"
          aria-hidden
        />
      )}
      {status === 'IN_PROGRESS' && isUnlocked && (
        <span
          className="absolute inset-0 animate-pulse rounded-full ring-2 ring-signal/50"
          aria-hidden
        />
      )}
    </span>
  );

  const wrapped = isUnlocked ? (
    <Link
      href={`/learn/${pathSlug}/${lesson.slug}`}
      className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
    >
      {node}
    </Link>
  ) : (
    <span className="cursor-not-allowed" aria-disabled>
      {node}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <p className="font-serif italic text-paper-100">{lesson.title}</p>
        <p className="mt-0.5 font-mono uppercase tracking-[0.05em] text-paper-500">
          {meta.label} · {lesson.estimatedMinutes} min · {formatStatus(status)}
        </p>
        {!isUnlocked && blockingTitles.length > 0 && (
          <p className="mt-1 text-paper-300">Complete {blockingTitles.join(', ')} first.</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function lessonKindRing(kind: CurriculumLessonKind) {
  if (kind === 'LAB') return 'ring-signal/40';
  if (kind === 'SCENARIO') return 'ring-amber-400/40';
  return 'ring-sky-400/30';
}

function buildLessonStateClass({
  status,
  kind,
  isUnlocked,
}: {
  status: CurriculumLessonStatus;
  kind: CurriculumLessonKind;
  isUnlocked: boolean;
}) {
  if (!isUnlocked) {
    return 'border-ink-700 bg-ink-800 text-paper-500 opacity-50';
  }
  if (status === 'COMPLETED') {
    if (kind === 'LAB') return 'border-signal bg-signal text-ink-900';
    if (kind === 'SCENARIO') return 'border-amber-400 bg-amber-400 text-ink-900';
    return 'border-sky-400 bg-sky-400 text-ink-900';
  }
  if (status === 'IN_PROGRESS') {
    if (kind === 'LAB') return 'border-signal text-signal bg-signal/10';
    if (kind === 'SCENARIO') return 'border-amber-400 text-amber-200 bg-amber-400/10';
    return 'border-sky-400 text-sky-300 bg-sky-400/10';
  }
  // NOT_STARTED
  if (kind === 'LAB') return 'border-signal/50 text-signal/80 bg-ink-800';
  if (kind === 'SCENARIO') return 'border-amber-400/50 text-amber-300/80 bg-ink-800';
  return 'border-paper-500/60 text-paper-300 bg-ink-800';
}

function formatStatus(status: CurriculumLessonStatus): string {
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'IN_PROGRESS') return 'In progress';
  return 'Not started';
}
