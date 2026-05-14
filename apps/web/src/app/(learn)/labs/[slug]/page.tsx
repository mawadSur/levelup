import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import { ssrGet } from '@/lib/api/server-fetch';
import { ApiError } from '@/lib/api/errors';
import type { LabAttemptHistoryItem, LabDetail } from '@/lib/api/labs';
import { LabRunner } from './lab-runner';
import { LabAttemptSparkline } from '@/components/learn/lab-attempt-sparkline';
import { LabPastAttemptsCard } from '@/components/learn/lab-past-attempts-card';

interface LabPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LabPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Lab · ${slug}` };
}

export default async function LabDetailPage({ params }: LabPageProps) {
  const { slug } = await params;
  let lab: LabDetail | null = null;
  let loadError: { status: number; message: string } | null = null;

  let attempts: LabAttemptHistoryItem[] = [];

  try {
    lab = await ssrGet<LabDetail>(`/labs/${encodeURIComponent(slug)}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return notFound();
      loadError = { status: err.status, message: err.message };
    } else {
      loadError = {
        status: 0,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  if (lab) {
    try {
      attempts = await ssrGet<LabAttemptHistoryItem[]>(
        `/labs/${encodeURIComponent(slug)}/me/attempts`,
      );
    } catch {
      attempts = [];
    }
  }

  if (!lab) {
    return (
      <div className="mx-auto max-w-content space-y-6 px-6 py-10">
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-body-sm text-paper-300">Could not load lab.</p>
            {loadError && (
              <p className="font-mono text-mono-sm text-paper-500">
                HTTP {loadError.status} · {loadError.message}
              </p>
            )}
            <p>
              <Link
                href="/labs"
                className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal"
              >
                ← BACK TO LABS
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content space-y-6 px-6 py-10">
      <header className="space-y-3">
        <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          <Link href="/labs" className="hover:text-signal">
            HANDS-ON LABS
          </Link>{' '}
          · {lab.estimatedMinutes} MIN
        </p>
        <h1 className="font-serif text-display-md italic text-paper-100">{lab.title}</h1>
        {attempts.length > 0 && attempts[attempts.length - 1] && (
          <div className="flex items-center gap-3">
            <LabAttemptSparkline attempts={attempts} />
            <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              {attempts.length} ATTEMPT{attempts.length === 1 ? '' : 'S'} · LATEST{' '}
              {Math.round((attempts[attempts.length - 1]?.score ?? 0) * 100)}%
            </span>
          </div>
        )}
        <p className="max-w-reading text-body-lg text-paper-300">{lab.brief}</p>
      </header>

      <LabRunner lab={lab} />

      <LabPastAttemptsCard attempts={attempts} />
    </div>
  );
}
