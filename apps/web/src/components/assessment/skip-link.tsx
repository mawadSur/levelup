'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { studyPlan } from '@/lib/api';

/**
 * "Skip for now" link on the assessment landing page.
 *
 * Calls POST /assessments/skip which:
 *  1. Locks the user's aiLevel at BEGINNER (default — usually a no-op).
 *  2. Seeds a 4-week StudyPlan so the forced-baseline gate in
 *     (learn)/layout.tsx stops triggering.
 *
 * After a successful skip we route the learner to /learn — they can retake
 * the assessment later from /profile or the curriculum map.
 */
export function SkipAssessmentLink() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-2 text-center">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(() => {
            studyPlan
              .skipAssessment()
              .then(() => router.replace('/learn'))
              .catch(() => setError('Could not skip — please try again.'));
          });
        }}
        className="text-xs font-medium text-paper-400 underline-offset-4 hover:text-paper-200 hover:underline disabled:opacity-50"
      >
        {isPending ? 'Skipping…' : 'Skip for now'}
      </button>
      {error !== null ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
