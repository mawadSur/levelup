'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@levelup/ui';
import { progress } from '@/lib/api';
import { isApiError } from '@/lib/api/errors';

interface MarkLessonReadButtonProps {
  lessonId: string;
  nextHref: string | null;
}

const TRANSIENT_RETRY_DELAY_MS = 1200;

export function MarkLessonReadButton({ lessonId, nextHref }: MarkLessonReadButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function attempt(allowRetry: boolean): Promise<void> {
    try {
      await progress.completeLesson(lessonId);
      if (nextHref !== null) {
        router.push(nextHref);
      } else {
        router.refresh();
      }
    } catch (err) {
      // Session expired — bounce through /sign-in and come back to this lesson.
      if (isApiError(err) && err.isAuthRequired) {
        const next = pathname ?? '/learn';
        router.push(`/sign-in?redirect=${encodeURIComponent(next)}`);
        return;
      }

      // Transient server error — one retry with a short delay covers most
      // Render cold-starts and Vercel-rewrite blips that bit deployed E2E.
      if (allowRetry && isApiError(err) && err.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
        await attempt(false);
        return;
      }

      // Surface the actual reason instead of a generic "could not save" so the
      // next failure has enough information to debug.
      let display: string;
      if (isApiError(err)) {
        const suffix = err.requestId !== undefined ? ` (request ${err.requestId})` : '';
        display = `${err.message}${suffix}`;
      } else if (err instanceof Error) {
        display = err.message;
      } else {
        display = 'Unknown error — try again';
      }
      // Visible in browser DevTools for forensics — never displayed to the user
      // as raw `error` (we render `display` instead).

      console.error('[MarkLessonReadButton] completeLesson failed', err);
      setErrorMessage(display);
      setState('error');
    }
  }

  async function handleMark(): Promise<void> {
    setState('loading');
    setErrorMessage(null);
    await attempt(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button onClick={handleMark} disabled={state === 'loading'} variant="default">
        {state === 'loading' ? 'Saving…' : state === 'error' ? 'Try again' : 'Mark as read'}
      </Button>
      {state === 'error' && errorMessage !== null && (
        <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-danger">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
