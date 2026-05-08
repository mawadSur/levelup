import Link from 'next/link';
import { Check } from 'lucide-react';
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
  NOT_STARTED: { label: 'NOT STARTED', variant: 'default' as const },
  IN_PROGRESS: { label: 'IN PROGRESS', variant: 'signal' as const },
  COMPLETED: { label: 'COMPLETED', variant: 'success' as const },
};

export function LessonRow({ lesson, pathSlug, isCurrent = false }: LessonRowProps) {
  const config = statusConfig[lesson.status];
  const buttonLabel =
    lesson.status === 'COMPLETED' ? 'Review' : lesson.status === 'IN_PROGRESS' ? 'Resume' : 'Start';

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-md border bg-ink-800 px-4 py-3 transition-colors',
        isCurrent ? 'border-signal-dim bg-ink-800' : 'border-ink-600 hover:border-signal-dim',
      )}
    >
      {/* Mono lesson number / completion glyph */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-data border font-mono text-mono uppercase tracking-[0.05em] tabular-nums',
          lesson.status === 'COMPLETED'
            ? 'border-success/40 bg-success/15 text-success'
            : isCurrent
              ? 'border-signal-dim bg-ink-700 text-signal'
              : 'border-ink-500 bg-ink-700 text-paper-300',
        )}
        aria-hidden="true"
      >
        {lesson.status === 'COMPLETED' ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          String(lesson.order).padStart(2, '0')
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-body font-medium',
            isCurrent ? 'text-paper-100' : 'text-paper-100',
          )}
        >
          {lesson.title}
        </p>
        <p className="mt-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          ~{lesson.estimatedMinutes} MIN
        </p>
      </div>

      <Badge variant={config.variant} className="hidden sm:inline-flex">
        {config.label}
      </Badge>

      <Button asChild size="sm" variant={lesson.status === 'IN_PROGRESS' ? 'primary' : 'secondary'}>
        <Link href={`/learn/${pathSlug}/${lesson.slug}`}>{buttonLabel}</Link>
      </Button>
    </div>
  );
}
