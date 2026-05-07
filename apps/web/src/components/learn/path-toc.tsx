import Link from 'next/link';
import { cn } from '@levelup/ui';

export interface TocLesson {
  id: string;
  slug: string;
  title: string;
  order: number;
  estimatedMinutes: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface PathTocProps {
  pathSlug: string;
  pathTitle: string;
  lessons: TocLesson[];
  currentLessonSlug: string;
  remainingMinutes: number;
}

export function PathToc({
  pathSlug,
  pathTitle,
  lessons,
  currentLessonSlug,
  remainingMinutes,
}: PathTocProps) {
  return (
    <aside className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        In this path
      </h2>
      <p className="mb-3 text-sm font-medium text-foreground leading-snug">{pathTitle}</p>

      <nav aria-label="Lesson table of contents">
        <ol className="space-y-1">
          {lessons.map((lesson) => {
            const isCurrent = lesson.slug === currentLessonSlug;
            return (
              <li key={lesson.id}>
                <Link
                  href={`/learn/${pathSlug}/${lesson.slug}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-2 text-xs transition-colors',
                    isCurrent
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {/* Status icon */}
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      lesson.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-600'
                        : isCurrent
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground',
                    )}
                    aria-hidden="true"
                  >
                    {lesson.status === 'COMPLETED' ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      lesson.order
                    )}
                  </span>
                  <span className="flex-1 leading-snug">{lesson.title}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {remainingMinutes > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Estimated time remaining: <span className="font-medium">{remainingMinutes} min</span>
        </p>
      )}

      {/* AI Coach helper */}
      <div className="mt-4 rounded-lg border border-border bg-background p-3">
        <p className="text-xs font-medium text-foreground">Need help?</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The AI Coach can answer questions about this lesson.
        </p>
        <Link
          href={`/coach?context=${currentLessonSlug}`}
          className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
        >
          Get help from AI Coach &rarr;
        </Link>
      </div>
    </aside>
  );
}
