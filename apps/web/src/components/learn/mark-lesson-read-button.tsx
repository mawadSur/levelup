'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@levelup/ui';
import { progress } from '@/lib/api';

interface MarkLessonReadButtonProps {
  lessonId: string;
  nextHref: string | null;
}

export function MarkLessonReadButton({ lessonId, nextHref }: MarkLessonReadButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  async function handleMark() {
    setState('loading');
    try {
      await progress.completeLesson(lessonId);
      // Auto-advance: take the learner straight into the next lesson. Falls
      // back to a refresh when there's no next lesson (path complete — the
      // refresh surfaces the cert state). Matches the scenario + lab flows.
      if (nextHref) {
        router.push(nextHref);
      } else {
        router.refresh();
      }
    } catch {
      setState('error');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button onClick={handleMark} disabled={state === 'loading'} variant="default">
        {state === 'loading' ? 'Saving…' : 'Mark as read'}
      </Button>
      {state === 'error' && (
        <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-danger">
          Could not save — try again
        </span>
      )}
    </div>
  );
}
