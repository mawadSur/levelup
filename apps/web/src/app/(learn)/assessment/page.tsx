import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Button, Card, CardContent } from '@levelup/ui';
import { assessments, ApiError } from '@/lib/api';
import type { MyAssessment } from '@/lib/api/assessments';
import { LevelBadge } from '@/components/assessment/level-badge';

export const metadata: Metadata = {
  title: 'Baseline assessment',
};

// We can't pull the cookie-bound API on the server cleanly, so this is a server
// component that does its best to surface a "you've taken this before" UI when
// `listMyAssessments` succeeds. If the request fails (e.g. unauthenticated
// in a preview), we fall back to the intro screen.
async function fetchRecentBaseline(): Promise<MyAssessment | null> {
  try {
    const all = await assessments.listMyAssessments();
    const baseline = all
      .filter((a) => a.type === 'BASELINE')
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
    return baseline ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    return null;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
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
            <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
              Your AI Baseline
            </h1>
            <p className="mx-auto mb-6 max-w-sm text-balance text-sm text-muted-foreground">
              Take a short assessment so we can recommend the right learning path for you.
            </p>
            <Button asChild size="lg">
              <Link href="/assessment/start">
                Get started
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <Card>
        <CardContent className="pt-8 pb-8 text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            You&apos;re all set
          </p>
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
            You took the baseline on {formatDate(recent.completedAt)}
          </h1>

          <div className="mb-6 flex justify-center">
            <LevelBadge level={recent.recommendedLevel} size="lg" />
          </div>

          <p className="mx-auto mb-7 max-w-sm text-balance text-sm text-muted-foreground">
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
