'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, MissionNumber, MonoLabel, Separator } from '@levelup/ui';
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
        <Loader2 className="h-6 w-6 animate-spin text-paper-300" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <MonoLabel>NO RECENT RESULT</MonoLabel>
            <p className="text-body-sm text-paper-300">
              Take the baseline assessment to see your recommended level.
            </p>
            <Button asChild variant="primary">
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
    <div className="mx-auto max-w-content px-6 py-12 sm:py-16">
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2">
          <Sparkles size={14} className="text-signal" aria-hidden="true" />
          <MonoLabel tone="signal">ASSESSMENT COMPLETE</MonoLabel>
        </div>
        <p className="mb-4 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          RECOMMENDED LEVEL
        </p>
        <h1 className="mb-3 font-serif text-display-lg italic text-paper-100">
          <MissionNumber value={result.score / 100} format="percent" /> ·{' '}
          {result.recommendedLevel.replace('_', ' ')}
        </h1>
        <div className="mb-4 flex justify-center">
          <LevelBadge level={result.recommendedLevel} size="lg" />
        </div>
        <p className="mx-auto max-w-reading text-balance text-body text-paper-300">
          {levelDescription(result.recommendedLevel)}
        </p>
      </div>

      <Card className="mx-auto mt-10 max-w-2xl">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <MonoLabel>OVERALL SCORE</MonoLabel>
              <span className="font-serif text-h1 italic tabular-nums text-paper-100">
                {result.score}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-data bg-ink-700">
              <div
                className="h-full bg-signal transition-[width] duration-500 ease-mission"
                style={{ width: `${result.score}%` }}
              />
            </div>
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              {result.answered} / {result.total} ANSWERED
              {result.skipped > 0 ? ` · ${result.skipped} SKIPPED` : ''}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <MonoLabel>BREAKDOWN BY LEVEL</MonoLabel>
            <ul className="space-y-2.5">
              {ALL_LEVELS.map((level) => (
                <li key={level} className="flex items-center gap-3">
                  <div className="w-32 flex-none">
                    <LevelBadge level={level} size="sm" />
                  </div>
                  <div className="h-1 flex-1 overflow-hidden rounded-data bg-ink-700">
                    <div
                      className="h-full bg-signal transition-[width] duration-500 ease-mission"
                      style={{ width: `${breakdown[level]}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-mono-sm tabular-nums text-paper-100">
                    {breakdown[level]}%
                  </span>
                </li>
              ))}
            </ul>
            <p className="pt-1 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              YOU CAN RETAKE THIS ANY TIME
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="secondary" asChild>
          <Link href="/assessment/start">
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Retake assessment
          </Link>
        </Button>
        <Button asChild variant="primary" size="lg">
          <Link href="/learn">
            See your tailored learning path
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
