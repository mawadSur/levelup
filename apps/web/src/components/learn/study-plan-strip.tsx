'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, MonoLabel, Progress } from '@levelup/ui';
import { studyPlan as studyPlanApi } from '@/lib/api';
import type { StudyPlanItem, StudyPlanWeek } from '@/lib/api/study-plan';

interface StudyPlanStripProps {
  initialCurrent: StudyPlanWeek | null;
  /** Only fetched on demand when the user toggles "View 4-week plan". */
  initialUpcoming?: StudyPlanWeek[] | null;
}

/**
 * "Your Week" strip — top-of-page checklist on /learn.
 *
 * Server fetches `initialCurrent` (and optionally `initialUpcoming`) so the
 * first render is instant. The expand toggle is client-only: when the user
 * clicks "View 4-week plan" and we don't have it cached, we lazy-load.
 */
export function StudyPlanStrip({ initialCurrent, initialUpcoming = null }: StudyPlanStripProps) {
  const [current] = useState<StudyPlanWeek | null>(initialCurrent);
  const [upcoming, setUpcoming] = useState<StudyPlanWeek[] | null>(initialUpcoming);
  const [expanded, setExpanded] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    if (upcoming !== null) return;
    let cancelled = false;
    setLoadingUpcoming(true);
    studyPlanApi
      .getUpcoming()
      .then((res) => {
        if (!cancelled) setUpcoming(res.plans);
      })
      .catch(() => {
        if (!cancelled) setUpcoming([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUpcoming(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, upcoming]);

  if (current === null) {
    return null;
  }

  const pct = Math.round(current.progress * 100);

  return (
    <section data-testid="study-plan-strip" className="animate-mission-in space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <MonoLabel tone="signal">YOUR WEEK</MonoLabel>
          <h2 className="font-serif text-h2 italic text-paper-100">This week&apos;s plan</h2>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide 4-week plan' : 'View 4-week plan'}
          className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300 hover:text-paper-100"
        >
          {expanded ? 'HIDE' : 'VIEW 4-WEEK PLAN'}
        </button>
      </header>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-400">
              {current.doneItems} OF {current.totalItems} DONE
            </p>
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              DUE {formatDueDate(current.targetCompletionDate)}
            </p>
          </div>
          <Progress value={pct} aria-label={`Week progress: ${pct}%`} />

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {current.items.map((item) => (
              <ItemPill key={itemKey(item)} item={item} />
            ))}
          </ul>
        </CardContent>
      </Card>

      {expanded ? (
        <UpcomingPreview weeks={upcoming} loading={loadingUpcoming} currentWeekId={current.id} />
      ) : null}
    </section>
  );
}

function ItemPill({ item }: { item: StudyPlanItem }) {
  const href = itemHref(item);
  const statusVariant: 'default' | 'secondary' | 'outline' =
    item.status === 'done' ? 'default' : item.status === 'in_progress' ? 'secondary' : 'outline';
  const statusLabel =
    item.status === 'done' ? 'Done' : item.status === 'in_progress' ? 'In progress' : 'Not started';

  return (
    <li>
      <Link
        href={href}
        className="block rounded-md border border-paper-800/40 bg-ink-800/30 p-4 transition-colors hover:border-signal/60 hover:bg-ink-800/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-mono text-mono-2xs uppercase tracking-[0.06em] text-paper-500">
              {item.kind === 'lab' ? 'LAB' : 'LESSON'} · {item.estimatedMinutes} MIN
            </p>
            <p className="line-clamp-2 text-body-sm text-paper-100">{item.title}</p>
          </div>
          <Badge variant={statusVariant} className="shrink-0">
            {statusLabel}
          </Badge>
        </div>
      </Link>
    </li>
  );
}

interface UpcomingPreviewProps {
  weeks: StudyPlanWeek[] | null;
  loading: boolean;
  currentWeekId: string;
}

function UpcomingPreview({ weeks, loading, currentWeekId }: UpcomingPreviewProps) {
  if (loading || weeks === null) {
    return (
      <Card>
        <CardContent className="p-6 text-body-sm text-paper-400">Loading your plan…</CardContent>
      </Card>
    );
  }

  const future = weeks.filter((w) => w.id !== currentWeekId);
  if (future.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-body-sm text-paper-400">
          No further weeks planned yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-400">
          UPCOMING (READ-ONLY)
        </p>
        <div className="space-y-4">
          {future.map((w) => (
            <div key={w.id} className="space-y-2 border-l-2 border-paper-800/40 pl-4">
              <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                WEEK {w.weekIndex} · {formatDueDate(w.weekOf)} –{' '}
                {formatDueDate(w.targetCompletionDate)}
              </p>
              <ul className="space-y-1">
                {w.items.map((item) => (
                  <li key={itemKey(item)} className="text-body-sm text-paper-300">
                    <span className="font-mono text-mono-2xs uppercase tracking-[0.06em] text-paper-500">
                      {item.kind === 'lab' ? 'LAB' : 'LESSON'} ·
                    </span>{' '}
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function itemHref(item: StudyPlanItem): string {
  if (item.kind === 'lesson') {
    return `/learn/${item.pathSlug}/${item.lessonSlug}`;
  }
  return `/labs/${item.slug}`;
}

function itemKey(item: StudyPlanItem): string {
  return item.kind === 'lesson' ? `lesson:${item.lessonId}` : `lab:${item.labId}`;
}

function formatDueDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ---------------------------------------------------------------------------
// Optional "Generate plan" CTA — used when current = null on a non-new user
// (e.g. assessment finished but plan generation hasn't run yet).
// ---------------------------------------------------------------------------

export function StudyPlanGenerateCta() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <MonoLabel tone="signal">YOUR WEEK</MonoLabel>
          <p className="font-serif text-h3 italic text-paper-100">
            Generate this week&apos;s plan.
          </p>
          <p className="max-w-reading text-body-sm text-paper-300">
            We&apos;ll pick the 2 lessons and 1 lab that match where you are.
          </p>
        </div>
        <Button
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(() => {
              studyPlanApi
                .generate({ force: false })
                .then(() => {
                  if (typeof window !== 'undefined') window.location.reload();
                })
                .catch(() => setError('Could not generate plan. Try again.'));
            });
          }}
        >
          {isPending ? 'Generating…' : 'Generate plan'}
        </Button>
        {error !== null ? <p className="text-body-sm text-red-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
