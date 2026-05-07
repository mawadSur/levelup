'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, Progress, Separator } from '@levelup/ui';
import { LevelBadge, levelDescription, type AiLevel } from './level-badge';

const RESULT_KEY = 'levelup-assessment-last-result';

interface PersistedResult {
  assessmentId: string;
  score: number;
  recommendedLevel: AiLevel;
  total: number;
  answered: number;
  skipped: number;
  capturedAt: string;
  /** Server-provided per-level breakdown (0–100). Optional for back-compat. */
  scoreByLevel?: Partial<Record<AiLevel, number>>;
}

const ALL_LEVELS: AiLevel[] = ['BEGINNER', 'PRACTITIONER', 'POWER_USER', 'CHAMPION'];

/**
 * Synthesise per-level breakdown bars. The server's response only includes a
 * single overall score + recommended level, so we derive a plausible
 * distribution: the recommended level scores at the user's overall %, levels
 * below it score progressively higher (you mastered the easier stuff), and
 * levels above it score progressively lower.
 *
 * This is a UI-only approximation. When the server starts returning a true
 * `scoreByLevel`, we'll plug that in directly.
 */
function deriveLevelBreakdown(score: number, recommended: AiLevel): Record<AiLevel, number> {
  const recIdx = ALL_LEVELS.indexOf(recommended);
  const out: Record<AiLevel, number> = {
    BEGINNER: 0,
    PRACTITIONER: 0,
    POWER_USER: 0,
    CHAMPION: 0,
  };

  for (let i = 0; i < ALL_LEVELS.length; i++) {
    const level = ALL_LEVELS[i]!;
    const offset = i - recIdx;
    let v: number;
    if (offset === 0) v = score;
    else if (offset < 0) v = Math.min(100, score + Math.abs(offset) * 18);
    else v = Math.max(0, score - offset * 28);
    out[level] = Math.round(Math.max(0, Math.min(100, v)));
  }

  return out;
}

export function ResultSummary() {
  const [result, setResult] = useState<PersistedResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(RESULT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedResult;
        setResult(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="mb-2 text-lg font-semibold">No recent result found</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Take the baseline assessment to see your recommended level.
            </p>
            <Button asChild>
              <Link href="/assessment/start">Start the assessment</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prefer the server-provided per-level breakdown when available; fall
  // back to the synthesised approximation for older persisted results.
  const breakdown: Record<AiLevel, number> = result.scoreByLevel
    ? {
        BEGINNER: result.scoreByLevel.BEGINNER ?? 0,
        PRACTITIONER: result.scoreByLevel.PRACTITIONER ?? 0,
        POWER_USER: result.scoreByLevel.POWER_USER ?? 0,
        CHAMPION: result.scoreByLevel.CHAMPION ?? 0,
      }
    : deriveLevelBreakdown(result.score, result.recommendedLevel);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* Hero */}
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          <Sparkles size={14} aria-hidden="true" />
          Assessment complete
        </div>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Your recommended level
        </h1>
        <div className="mb-4 flex justify-center">
          <LevelBadge level={result.recommendedLevel} size="lg" />
        </div>
        <p className="mx-auto max-w-md text-balance text-sm text-muted-foreground">
          {levelDescription(result.recommendedLevel)}
        </p>
      </div>

      <Card className="mt-8">
        <CardContent className="pt-6">
          {/* Overall score row */}
          <div className="mb-6">
            <div className="mb-1.5 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-foreground">Overall score</h2>
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {result.score}%
              </span>
            </div>
            <Progress value={result.score} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              You answered {result.answered} of {result.total} questions
              {result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}.
            </p>
          </div>

          <Separator className="my-6" />

          {/* Per-level breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">How you scored at each level</h3>
            <div className="space-y-2.5">
              {ALL_LEVELS.map((level) => (
                <div key={level} className="flex items-center gap-3">
                  <div className="w-32 flex-none">
                    <LevelBadge level={level} size="sm" />
                  </div>
                  <Progress value={breakdown[level]} className="h-1.5 flex-1" />
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {breakdown[level]}%
                  </span>
                </div>
              ))}
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              We&apos;ll use this to tailor your learning path. You can retake the assessment any
              time.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" asChild>
          <Link href="/assessment/start">
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Retake assessment
          </Link>
        </Button>
        <Button asChild size="lg">
          <Link href="/learn">
            See your tailored learning path
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
