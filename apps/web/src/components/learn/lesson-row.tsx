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
    textClass: 'text-muted-foreground',
  },
  IN_PROGRESS: { label: 'In progress', variant: 'secondary' as const, textClass: 'text-amber-600' },
  COMPLETED: { label: 'Completed', variant: 'default' as const, textClass: 'text-emerald-600' },
};

export function LessonRow({ lesson, pathSlug, isCurrent = false }: LessonRowProps) {
  const config = statusConfig[lesson.status];
  const buttonLabel =
    lesson.status === 'COMPLETED' ? 'Review' : lesson.status === 'IN_PROGRESS' ? 'Resume' : 'Start';

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border p-4 transition-colors',
        isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-accent/30',
      )}
    >
      {/* Order circle */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          lesson.status === 'COMPLETED'
            ? 'bg-emerald-100 text-emerald-700'
            : isCurrent
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground',
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
            isCurrent ? 'text-primary' : 'text-foreground',
          )}
        >
          {lesson.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">~{lesson.estimatedMinutes} min</p>
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
