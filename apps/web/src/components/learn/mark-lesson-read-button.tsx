'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@levelup/ui';
import { progress } from '@/lib/api';

interface MarkLessonReadButtonProps {
  lessonId: string;
  nextHref: string | null;
}

export function MarkLessonReadButton({ lessonId, nextHref }: MarkLessonReadButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  async function handleMark() {
    setState('loading');
    try {
      await progress.completeLesson(lessonId);
      setState('done');
      router.refresh();
    } catch {
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-2 text-sm font-medium text-success">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8l3.5 3.5L13 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Lesson complete!
        </span>
        {nextHref && (
          <Button asChild size="sm">
            <Link href={nextHref}>Next lesson &rarr;</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button onClick={handleMark} disabled={state === 'loading'} variant="default">
      {state === 'loading' ? 'Saving…' : 'Mark as read'}
    </Button>
  );
}
