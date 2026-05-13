import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardContent, MissionNumber, MonoLabel } from '@levelup/ui';
import { LessonRow } from '@/components/learn/lesson-row';
import type { LessonRowData } from '@/components/learn/lesson-row';
import { ApiError } from '@/lib/api/errors';
import { ssrGet } from '@/lib/api/server-fetch';
import type { LearningPath } from '@/lib/api/paths';
import type { Lesson } from '@/lib/api/lessons';
import type { PathProgress } from '@/lib/api/progress';

interface PathPageProps {
  params: Promise<{ pathSlug: string }>;
}

export async function generateMetadata({ params }: PathPageProps): Promise<Metadata> {
  const { pathSlug } = await params;
  try {
    const path = await ssrGet<LearningPath>(`/paths/${pathSlug}`);
    return { title: path.title };
  } catch {
    return { title: 'Path not found' };
  }
}

export default async function PathOverviewPage({ params }: PathPageProps) {
  const { pathSlug } = await params;

  let pathData: LearningPath;
  try {
    pathData = await ssrGet<LearningPath>(`/paths/${pathSlug}`);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) {
      notFound();
    }
    throw err;
  }

  // Fetch lessons + path progress in parallel. `getMyPathProgress` already
  // includes a per-lesson status so we don't need a separate getMyProgress
  // pass (which now returns per-path aggregates only, not per-lesson rows).
  const [lessonsResult, pathProgressResult] = await Promise.allSettled([
    ssrGet<Lesson[]>(`/paths/${pathData.id}/lessons`),
    ssrGet<PathProgress>(`/progress/me/paths/${pathData.id}`),
  ]);

  const lessonList = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const pathProgress = pathProgressResult.status === 'fulfilled' ? pathProgressResult.value : null;

  // Check if user is not assigned (403 from getMyPathProgress)
  const isNotAssigned =
    pathProgressResult.status === 'rejected' &&
    pathProgressResult.reason instanceof ApiError &&
    pathProgressResult.reason.status === 403;

  // Build a per-lesson status map from the path-progress payload. Server now
  // returns `lessons[]` with `{id, status, completedAt}` on each row.
  const pathLessonsWithStatus: Array<{ id: string; status?: string }> =
    (pathProgress as unknown as { lessons?: Array<{ id: string; status?: string }> })?.lessons ??
    [];
  const progressByLessonId = new Map<string, { status: string }>(
    pathLessonsWithStatus.map((l) => [l.id, { status: l.status ?? 'NOT_STARTED' }]),
  );

  // Sort lessons by order
  const sortedLessons = [...lessonList].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const pathProgressShape = pathProgress as unknown as {
    completionRate?: number;
    progressPct?: number;
    completedLessons?: number;
    lessonsCompleted?: number;
    totalLessons?: number;
  } | null;
  const completionRate = pathProgressShape?.completionRate ?? pathProgressShape?.progressPct ?? 0;
  const completedCount =
    pathProgressShape?.completedLessons ?? pathProgressShape?.lessonsCompleted ?? 0;
  const totalLessons = pathProgressShape?.totalLessons ?? sortedLessons.length;
  const isPathComplete = completionRate >= 100;

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <Link
        href="/learn"
        className="mb-8 inline-flex items-center gap-1.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500 transition-colors hover:text-paper-100"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M9 2L4 7l5 5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        BACK TO LEARNING
      </Link>

      <header className="mb-10 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <MonoLabel>PATH</MonoLabel>
          <Badge variant="default">{pathData.targetLevel}</Badge>
          {pathData.targetRole && <Badge variant="default">{pathData.targetRole}</Badge>}
        </div>
        <h1 className="font-serif text-display-md italic text-paper-100">{pathData.title}</h1>
        {pathData.description && (
          <p className="max-w-reading text-body-lg text-paper-300">{pathData.description}</p>
        )}
        <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          ~{pathData.estimatedMinutes} MIN · {sortedLessons.length} LESSONS
        </p>
      </header>

      {isNotAssigned && (
        <Card className="mb-10 border-warning/40 bg-warning/10">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <MonoLabel className="text-warning">UNASSIGNED</MonoLabel>
              <p className="text-body font-medium text-paper-100">
                You&apos;re not assigned to this path.
              </p>
              <p className="text-body-sm text-paper-300">
                Ask your manager to assign you to{' '}
                <em className="text-paper-100">{pathData.title}</em>.
              </p>
            </div>
            <Link
              href="/learn"
              className="shrink-0 font-mono text-mono-sm uppercase tracking-[0.05em] text-signal hover:text-paper-100"
            >
              BACK TO MY PATHS →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
        <div>
          <MonoLabel className="mb-4 block">LESSONS</MonoLabel>
          <div className="space-y-3">
            {sortedLessons.map((lesson) => {
              const lp = progressByLessonId.get(lesson.id);
              const status = (lp?.status ?? 'NOT_STARTED') as LessonRowData['status'];
              const rowData: LessonRowData = {
                id: lesson.id,
                slug: lesson.slug,
                title: lesson.title,
                order: lesson.orderIndex ?? 0,
                estimatedMinutes: lesson.estimatedMinutes,
                status,
              };
              return (
                <LessonRow
                  key={lesson.id}
                  lesson={rowData}
                  pathSlug={pathSlug}
                  isCurrent={status === 'IN_PROGRESS'}
                />
              );
            })}
            {sortedLessons.length === 0 && (
              <p className="rounded-md border border-dashed border-ink-600 p-8 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                NO LESSONS PUBLISHED YET
              </p>
            )}
          </div>
        </div>

        {!isNotAssigned && (
          <aside className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-2">
                  <MonoLabel>YOUR PROGRESS</MonoLabel>
                  <div className="flex items-baseline justify-between">
                    <p className="font-serif text-display-md tabular-nums text-paper-100">
                      <MissionNumber value={completionRate / 100} format="percent" />
                    </p>
                  </div>
                  <div className="h-1 overflow-hidden rounded-data bg-ink-700">
                    <div
                      className="h-full bg-signal transition-[width] duration-500 ease-mission"
                      style={{ width: `${Math.max(completionRate, 2)}%` }}
                    />
                  </div>
                  <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    {completedCount} / {totalLessons} LESSONS COMPLETE
                  </p>
                </div>

                {isPathComplete ? (
                  <div className="rounded-sm border border-success/40 bg-success/10 p-3 text-center">
                    <MonoLabel className="text-success">CERTIFICATE EARNED</MonoLabel>
                    <Link
                      href={`/certificates?path=${pathData.id}`}
                      className="mt-1 block font-mono text-mono-sm uppercase tracking-[0.05em] text-signal hover:text-paper-100"
                    >
                      VIEW CERTIFICATE →
                    </Link>
                  </div>
                ) : (
                  <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    COMPLETE ALL LESSONS TO EARN A CERTIFICATE.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-5">
                <MonoLabel>PATH DETAILS</MonoLabel>
                <dl className="space-y-1.5 font-mono text-mono-sm uppercase tracking-[0.05em]">
                  <div className="flex justify-between">
                    <dt className="text-paper-500">LEVEL</dt>
                    <dd className="text-paper-100">{pathData.targetLevel}</dd>
                  </div>
                  {pathData.targetRole && (
                    <div className="flex justify-between">
                      <dt className="text-paper-500">ROLE</dt>
                      <dd className="text-paper-100">{pathData.targetRole}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-paper-500">DURATION</dt>
                    <dd className="tabular-nums text-paper-100">
                      ~{pathData.estimatedMinutes} MIN
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-paper-500">LESSONS</dt>
                    <dd className="tabular-nums text-paper-100">{sortedLessons.length}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}
