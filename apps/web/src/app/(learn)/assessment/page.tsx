import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Button, Card, CardContent } from '@levelup/ui';
import { ApiError } from '@/lib/api';
import { ssrGet } from '@/lib/api/server-fetch';
import type { MyAssessment } from '@/lib/api/assessments';
import { LevelBadge } from '@/components/assessment/level-badge';
import { SkipAssessmentLink } from '@/components/assessment/skip-link';

export const metadata: Metadata = {
  title: 'Baseline assessment',
};

// We can't pull the cookie-bound API on the server cleanly, so this is a server
// component that does its best to surface a "you've taken this before" UI when
// `listMyAssessments` succeeds. If the request fails (e.g. unauthenticated
// in a preview), we fall back to the intro screen.
function assessmentDate(a: MyAssessment): string | undefined {
  return a.completedAt ?? a.createdAt;
}

async function fetchRecentBaseline(): Promise<MyAssessment | null> {
  try {
    const all = await ssrGet<MyAssessment[]>('/assessments/me');
    const baseline = all
      .filter((a) => a.type === 'BASELINE')
      .sort((a, b) => {
        const aTs = new Date(assessmentDate(a) ?? 0).getTime();
        const bTs = new Date(assessmentDate(b) ?? 0).getTime();
        return bTs - aTs;
      })[0];
    return baseline ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    return null;
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default async function AssessmentLandingPage() {
  const recent = await fetchRecentBaseline();

  if (!recent) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <h1 className="mb-3 text-2xl font-bold tracking-tight text-paper-100">
              Your AI Baseline
            </h1>
            <p className="mx-auto mb-6 max-w-sm text-balance text-sm text-paper-300">
              Take a short assessment so we can recommend the right learning path for you.
            </p>
            <Button asChild size="lg">
              <Link href="/assessment/start">
                Get started
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <SkipAssessmentLink />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <Card>
        <CardContent className="pt-8 pb-8 text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-paper-300">
            You&apos;re all set
          </p>
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-paper-100">
            You took the baseline on {formatDate(assessmentDate(recent))}
          </h1>

          <div className="mb-6 flex justify-center">
            <LevelBadge level={recent.recommendedLevel} size="lg" />
          </div>

          <p className="mx-auto mb-7 max-w-sm text-balance text-sm text-paper-300">
            We&apos;ve already tailored your learning path. You can retake the assessment any time
            if your role or experience has changed.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/assessment/result">View result</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/assessment/start">
                <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Retake assessment
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
