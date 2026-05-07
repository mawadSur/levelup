import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardContent, Progress } from '@levelup/ui';
import { paths, lessons, progress } from '@/lib/api';
import { LessonRow } from '@/components/learn/lesson-row';
import type { LessonRowData } from '@/components/learn/lesson-row';
import { ApiError } from '@/lib/api/errors';

interface PathPageProps {
  params: Promise<{ pathSlug: string }>;
}

export async function generateMetadata({ params }: PathPageProps): Promise<Metadata> {
  const { pathSlug } = await params;
  try {
    const path = await paths.getPath(pathSlug);
    return { title: path.title };
  } catch {
    return { title: 'Path not found' };
  }
}

export default async function PathOverviewPage({ params }: PathPageProps) {
  const { pathSlug } = await params;

  let pathData: Awaited<ReturnType<typeof paths.getPath>>;
  try {
    pathData = await paths.getPath(pathSlug);
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
    lessons.listLessons(pathData.id),
    progress.getMyPathProgress(pathData.id),
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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/learn"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
        Back to learning
      </Link>

      {/* Path header */}
      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{pathData.targetLevel}</Badge>
          {pathData.targetRole && <Badge variant="secondary">{pathData.targetRole}</Badge>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{pathData.title}</h1>
        {pathData.description && (
          <p className="max-w-2xl text-muted-foreground leading-relaxed">{pathData.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          ~{pathData.estimatedMinutes} min &middot; {sortedLessons.length} lessons
        </p>
      </div>

      {/* Not assigned CTA */}
      {isNotAssigned && (
        <Card className="mb-8 border-amber-300/50 bg-amber-50/50">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">You&apos;re not assigned to this path</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Ask your manager to assign you to <strong>{pathData.title}</strong>.
              </p>
            </div>
            <Link
              href="/learn"
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Back to my paths &rarr;
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Lessons list */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Lessons
          </h2>
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
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No lessons published yet.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {!isNotAssigned && (
          <aside className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Your progress</span>
                    <span className="font-semibold text-foreground">
                      {Math.round(completionRate)}%
                    </span>
                  </div>
                  <Progress value={completionRate} className="h-2.5" />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {completedCount} of {totalLessons} lessons completed
                  </p>
                </div>

                {isPathComplete ? (
                  <div className="rounded-lg border border-emerald-300/50 bg-emerald-50/50 p-3 text-center">
                    <p className="text-sm font-semibold text-emerald-700">Certificate earned!</p>
                    <Link
                      href={`/certificates?path=${pathData.id}`}
                      className="mt-1 text-xs text-primary hover:underline"
                    >
                      View certificate &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      Complete all lessons to earn your certificate.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Path details
                </p>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Level</dt>
                    <dd className="font-medium text-foreground">{pathData.targetLevel}</dd>
                  </div>
                  {pathData.targetRole && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Role</dt>
                      <dd className="font-medium text-foreground">{pathData.targetRole}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="font-medium text-foreground">
                      ~{pathData.estimatedMinutes} min
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Lessons</dt>
                    <dd className="font-medium text-foreground">{sortedLessons.length}</dd>
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
