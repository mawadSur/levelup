'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import { LabRunner } from '@/app/(learn)/labs/[slug]/lab-runner';
import { getLab } from '@/lib/api/labs';
import type { LabDetail } from '@/lib/api/labs';
import { apiPost } from '@/lib/api/client';

interface LessonLabRunnerProps {
  labSlug: string;
  brief: string;
  lessonId: string;
  isCompleted: boolean;
  nextLessonHref: string | null;
}

/**
 * Inline lab UI for `kind: LAB` lessons. Fetches the full lab detail on mount,
 * then mounts the existing LabRunner with an onLessonComplete callback that
 * marks the host lesson done (which the API already routes through the
 * standard progress flow → XP, streak, badge, cert).
 */
export function LessonLabRunner({
  labSlug,
  brief,
  lessonId,
  isCompleted,
  nextLessonHref,
}: LessonLabRunnerProps) {
  const [lab, setLab] = useState<LabDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLab(labSlug)
      .then((res) => {
        if (!cancelled) setLab(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load lab.');
      });
    return () => {
      cancelled = true;
    };
  }, [labSlug]);

  async function handleLessonComplete() {
    await apiPost(`/progress/lessons/${lessonId}/complete`, {});
  }

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-2 p-5">
          <MonoLabel>UNAVAILABLE</MonoLabel>
          <p className="text-body-sm text-paper-300">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!lab) {
    return (
      <Card>
        <CardContent className="space-y-2 p-5">
          <MonoLabel>LOADING</MonoLabel>
          <p className="text-body-sm text-paper-500">Preparing the practice lab…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-5">
          <MonoLabel tone="signal">HANDS-ON PRACTICE</MonoLabel>
          <p className="text-body-md text-paper-200">{brief}</p>
          {isCompleted && (
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-success">
              ALREADY COMPLETED — TRY AGAIN TO SHARPEN YOUR SCORE
            </p>
          )}
        </CardContent>
      </Card>

      <LabRunner
        lab={lab}
        onLessonComplete={isCompleted ? undefined : handleLessonComplete}
        nextLessonHref={nextLessonHref}
      />
    </div>
  );
}
