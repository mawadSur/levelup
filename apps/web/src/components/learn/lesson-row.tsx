import Link from 'next/link';
import { Badge, Button } from '@levelup/ui';
import { cn } from '@levelup/ui';

export interface LessonRowData {
  id: string;
  slug: string;
  title: string;
  order: number;
  estimatedMinutes: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface LessonRowProps {
  lesson: LessonRowData;
  pathSlug: string;
  isCurrent?: boolean;
}

const statusConfig = {
  NOT_STARTED: {
    label: 'Not started',
    variant: 'outline' as const,
    textClass: 'text-paper-300',
  },
  IN_PROGRESS: { label: 'In progress', variant: 'secondary' as const, textClass: 'text-warning' },
  COMPLETED: { label: 'Completed', variant: 'default' as const, textClass: 'text-success' },
};

export function LessonRow({ lesson, pathSlug, isCurrent = false }: LessonRowProps) {
  const config = statusConfig[lesson.status];
  const buttonLabel =
    lesson.status === 'COMPLETED' ? 'Review' : lesson.status === 'IN_PROGRESS' ? 'Resume' : 'Start';

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border p-4 transition-colors',
        isCurrent
          ? 'border-signal/40 bg-signal/5'
          : 'border-ink-600 bg-ink-800 hover:bg-ink-700/30',
      )}
    >
      {/* Order circle */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          lesson.status === 'COMPLETED'
            ? 'bg-success/15 text-success'
            : isCurrent
              ? 'bg-signal/15 text-signal'
              : 'bg-ink-700 text-paper-300',
        )}
        aria-hidden="true"
      >
        {lesson.status === 'COMPLETED' ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8l3.5 3.5L13 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          lesson.order
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'truncate text-sm font-medium',
            isCurrent ? 'text-signal' : 'text-paper-100',
          )}
        >
          {lesson.title}
        </p>
        <p className="mt-0.5 text-xs text-paper-300">~{lesson.estimatedMinutes} min</p>
      </div>

      {/* Status badge */}
      <Badge
        variant={config.variant}
        className={cn('hidden sm:inline-flex text-xs', config.textClass)}
      >
        {config.label}
      </Badge>

      {/* Action button */}
      <Button asChild size="sm" variant={lesson.status === 'IN_PROGRESS' ? 'default' : 'outline'}>
        <Link href={`/learn/${pathSlug}/${lesson.slug}`}>{buttonLabel}</Link>
      </Button>
    </div>
  );
}
