import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Badge, MonoLabel } from '@levelup/ui';
import type { Quiz, QuizAttempt } from '@/lib/api/quizzes';
import { MarkdownView } from '@/components/learn/markdown-view';
import { QuizRunner } from '@/components/learn/quiz-runner';
import { PathToc } from '@/components/learn/path-toc';
import { MobileTocSelect } from '@/components/learn/mobile-toc-select';
import { BackToTop } from '@/components/learn/back-to-top';
import { MarkLessonReadButton } from '@/components/learn/mark-lesson-read-button';
import { ReadingProgressBar } from '@/components/learn/reading-progress-bar';
import { LessonHeroFade } from '@/components/learn/lesson-hero-fade';
import type { TocLesson } from '@/components/learn/path-toc';
// LessonProgress was removed from the per-lesson page — per-lesson status
// now arrives via `progress.getMyPathProgress(pathId).lessons`.
import { ApiError } from '@/lib/api/errors';
import { ssrGet, ssrPost } from '@/lib/api/server-fetch';
import type { LearningPath } from '@/lib/api/paths';
import type { Lesson } from '@/lib/api/lessons';
import type { LessonProgress, PathProgress } from '@/lib/api/progress';

interface LessonPageProps {
  params: Promise<{ pathSlug: string; lessonSlug: string }>;
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { pathSlug, lessonSlug } = await params;
  try {
    const pathData = await ssrGet<LearningPath>(`/paths/${pathSlug}`);
    const lessonList = await ssrGet<Lesson[]>(`/paths/${pathData.id}/lessons`);
    const lesson = lessonList.find((l) => l.slug === lessonSlug);
    return { title: lesson?.title ?? 'Lesson' };
  } catch {
    return { title: 'Lesson' };
  }
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { pathSlug, lessonSlug } = await params;

  // 1. Get path
  let pathData: LearningPath;
  try {
    pathData = await ssrGet<LearningPath>(`/paths/${pathSlug}`);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) notFound();
    throw err;
  }

  // 2. Get all lessons for this path (for TOC + ordering)
  const lessonList = await ssrGet<Lesson[]>(`/paths/${pathData.id}/lessons`).catch(
    () => [] as Lesson[],
  );
  const sortedLessons = [...lessonList].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  // 3. Find the current lesson (TOC view) — body is fetched separately via
  //    GET /lessons/:id since the list endpoint omits the lesson body to
  //    keep payloads small.
  const currentLessonStub = sortedLessons.find((l) => l.slug === lessonSlug);
  if (!currentLessonStub) notFound();
  const currentLesson = await ssrGet<Lesson>(`/lessons/${currentLessonStub.id}`).catch(
    () => currentLessonStub,
  );

  // 4. Mark lesson as started (server-side, idempotent)
  const startResult = await ssrPost<{ lessonId: string }, LessonProgress>('/progress/start', {
    lessonId: currentLesson.id,
  }).catch(() => null);

  // 5. Fetch path progress (per-lesson statuses) + quiz data in parallel.
  //    The previous `getMyProgress()` flat lesson list is replaced by per-path
  //    aggregates; per-lesson status now lives inside `getMyPathProgress`.
  const [pathProgressResult, quizResult] = await Promise.allSettled([
    ssrGet<PathProgress>(`/progress/me/paths/${pathData.id}`),
    fetchQuizForLesson(currentLesson.id),
  ]);

  const pathProgress = pathProgressResult.status === 'fulfilled' ? pathProgressResult.value : null;
  const lessonsWithStatus =
    (pathProgress as unknown as { lessons?: Array<{ id: string; status?: string }> } | null)
      ?.lessons ?? [];
  const progressMap = new Map<string, { status: string; lessonId: string }>(
    lessonsWithStatus.map((l) => [l.id, { status: l.status ?? 'NOT_STARTED', lessonId: l.id }]),
  );

  const quizData = quizResult.status === 'fulfilled' ? quizResult.value : null;

  // 6. Fetch quiz attempts if quiz exists
  const attemptsResult = quizData
    ? await ssrGet<QuizAttempt[]>(`/quizzes/${quizData.id}/attempts/me`).catch(
        () => [] as QuizAttempt[],
      )
    : [];

  // 7. Build TOC data
  const tocLessons: TocLesson[] = sortedLessons.map((l) => {
    const lp = progressMap.get(l.id);
    const status = (lp?.status ?? 'NOT_STARTED') as TocLesson['status'];
    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      order: l.orderIndex ?? 0,
      estimatedMinutes: l.estimatedMinutes,
      status,
    };
  });

  // 8. Find next lesson
  const currentIdx = sortedLessons.findIndex((l) => l.slug === lessonSlug);
  const nextLesson = currentIdx >= 0 ? (sortedLessons[currentIdx + 1] ?? null) : null;
  const nextLessonHref = nextLesson ? `/learn/${pathSlug}/${nextLesson.slug}` : null;

  // 9. Compute estimated remaining time (sum of not-completed lessons from here)
  const remainingMinutes = sortedLessons
    .slice(currentIdx >= 0 ? currentIdx : 0)
    .filter((l) => {
      const lp = progressMap.get(l.id);
      return !lp || lp.status !== 'COMPLETED';
    })
    .reduce((sum, l) => sum + l.estimatedMinutes, 0);

  // 10. Determine completion state
  const currentProgress = progressMap.get(currentLesson.id) ?? startResult;
  const isCompleted = currentProgress?.status === 'COMPLETED';
  const hasPassedQuiz = quizData ? attemptsResult.some((a) => a.passed) : false;

  // Lesson content — server returns `body`; legacy `content` retained for
  // older callers. Prefer body when both are present.
  const content = currentLesson.body ?? currentLesson.content ?? '';
  const youtubeEmbedUrl = extractYouTubeEmbed(currentLesson.videoUrl);

  return (
    <>
      <BackToTop />
      {/* Reading progress bar — tracks scroll through the lesson article */}
      <ReadingProgressBar target="#lesson-article" />

      <div className="mx-auto max-w-content px-6 py-10">
        <LessonHeroFade>
          <Link
            href={`/learn/${pathSlug}`}
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
            {pathData.title.toUpperCase()}
          </Link>
        </LessonHeroFade>

        <MobileTocSelect
          pathSlug={pathSlug}
          lessons={tocLessons.map((l) => ({ slug: l.slug, title: l.title, order: l.order }))}
          currentLessonSlug={lessonSlug}
        />

        <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
          <article id="lesson-article" className="mx-auto min-w-0 max-w-reading">
            <LessonHeroFade className="mb-10 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <MonoLabel>LESSON {String(currentLesson.order).padStart(2, '0')}</MonoLabel>
                <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  ~{currentLesson.estimatedMinutes} MIN
                </span>
                {isCompleted && <Badge variant="success">COMPLETED</Badge>}
              </div>
              <h1 className="font-serif text-display-md italic leading-tight text-paper-100">
                {currentLesson.title}
              </h1>
            </LessonHeroFade>

            {youtubeEmbedUrl && (
              <div className="mb-8 aspect-video w-full overflow-hidden rounded-md border border-ink-600 bg-ink-800">
                <iframe
                  src={youtubeEmbedUrl}
                  title={`Video: ${currentLesson.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                  loading="lazy"
                />
              </div>
            )}

            {content ? (
              <MarkdownView content={content} className="pb-8" />
            ) : (
              <div className="rounded-md border border-dashed border-ink-600 p-10 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                LESSON CONTENT COMING SOON
              </div>
            )}

            <div className="mt-10 border-t border-ink-600 pt-8">
              {!quizData && !isCompleted && (
                <MarkLessonReadButton lessonId={currentLesson.id} nextHref={nextLessonHref} />
              )}

              {quizData && !isCompleted && !hasPassedQuiz && (
                <div className="flex flex-wrap items-center gap-4">
                  <Button asChild variant="primary">
                    <a href="#quiz">Take the quick check</a>
                  </Button>
                  <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    PASS THE QUIZ TO MARK COMPLETE
                  </span>
                </div>
              )}

              {isCompleted && !quizData && nextLessonHref && (
                <Button asChild variant="primary">
                  <Link href={nextLessonHref}>Next lesson →</Link>
                </Button>
              )}

              {isCompleted && !quizData && !nextLessonHref && (
                <div className="flex items-center gap-2 font-mono text-mono-sm uppercase tracking-[0.05em] text-success">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M3 8l3.5 3.5L13 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  PATH COMPLETE — VIEW YOUR CERTIFICATE IN{' '}
                  <Link href="/learn" className="underline">
                    YOUR PATHS
                  </Link>
                </div>
              )}
            </div>

            {/* Quiz section */}
            {quizData && (
              <QuizRunner
                quiz={quizData}
                previousAttempts={attemptsResult}
                nextLessonHref={nextLessonHref}
              />
            )}
          </article>

          {/* Sidebar (desktop only) */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <PathToc
                pathSlug={pathSlug}
                pathTitle={pathData.title}
                lessons={tocLessons}
                currentLessonSlug={lessonSlug}
                remainingMinutes={remainingMinutes}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert YouTube watch/share URLs to privacy-enhanced embed URLs. */
function extractYouTubeEmbed(url: string | null): string | null {
  if (!url) return null;
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch?.[1]) {
    return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}`;
  }
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
    return url;
  }
  return null;
}

/**
 * Attempt to retrieve the quiz for a given lesson.
 *
 * API AMBIGUITY: The `lessons.getLesson` response shape (`Lesson`) does not
 * include a `quizId` field, and there is no `GET /quizzes?lessonId=` endpoint
 * in the current API contract. We resolve this with a best-effort cast: if the
 * runtime lesson object carries an undocumented `quizId` string, we fetch it.
 * Otherwise, we return null and the lesson renders without a quiz.
 *
 * Resolution needed: either add `quizId?: string` to the Lesson type, or add
 * a `GET /learning-paths/:pathId/lessons/:id/quiz` endpoint.
 */
type QuizLike = { id: string; lessonId: string; questions: unknown[]; passingScore: number };

async function fetchQuizForLesson(lessonId: string) {
  // API AMBIGUITY: The Lesson type does not expose a quizId field, and no
  // dedicated "quiz by lessonId" endpoint exists in the contract. We probe
  // GET /quizzes?lessonId=... and gracefully return null on any error.
  // See report section "API contract ambiguities".
  try {
    const result = await ssrGet<unknown>(`/quizzes?lessonId=${lessonId}`);
    // Single-object response
    if (result !== null && typeof result === 'object' && !Array.isArray(result) && 'id' in result) {
      return result as Quiz;
    }
    // Array response
    if (Array.isArray(result) && result.length > 0) {
      const first = result[0] as QuizLike | undefined;
      if (first?.id) {
        return first as unknown as Quiz;
      }
    }
  } catch {
    // No quiz for this lesson — perfectly fine
  }
  return null;
}
