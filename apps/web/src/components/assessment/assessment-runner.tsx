'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, SkipForward } from 'lucide-react';
import { Button, Card, CardContent, MonoLabel } from '@levelup/ui';
import { assessments } from '@/lib/api';
import type { Assessment, AssessmentItem } from '@/lib/api/assessments';
import { ProgressHeader } from './progress-header';
import { QuestionCard } from './question-card';

// ---------------------------------------------------------------------------
// localStorage helpers
//
// We persist `{ items, answers, index }` keyed by the assessment id so that a
// refresh mid-flow doesn't wipe progress. We don't persist the result — that's
// done separately by the take page after submit.
// ---------------------------------------------------------------------------
const STORAGE_PREFIX = 'levelup-assessment-';
const RESULT_KEY = 'levelup-assessment-last-result';

interface PersistedRun {
  assessmentId: string;
  items: AssessmentItem[];
  // Map of itemId -> selected choice index. -1 means "skipped".
  answers: Record<string, number>;
  index: number;
}

function readPersisted(assessmentId: string): PersistedRun | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${assessmentId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRun;
    if (!parsed?.items || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(run: PersistedRun): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${run.assessmentId}`, JSON.stringify(run));
  } catch {
    // ignore quota errors
  }
}

function clearPersisted(assessmentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${assessmentId}`);
  } catch {
    // ignore
  }
}

/**
 * The active "in progress" assessment id is also tracked separately so that a
 * page refresh mid-flow can find the right key without round-tripping the
 * server.
 */
const ACTIVE_KEY = 'levelup-assessment-active-id';
function setActive(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}
function getActive(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}
function clearActive(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
type Phase = 'idle' | 'loading' | 'answering' | 'submitting' | 'done' | 'error';

interface RunnerState {
  phase: Phase;
  assessment: Assessment | null;
  answers: Record<string, number>;
  index: number;
  errorMessage: string | null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function AssessmentRunner() {
  const router = useRouter();
  const [state, setState] = useState<RunnerState>({
    phase: 'idle',
    assessment: null,
    answers: {},
    index: 0,
    errorMessage: null,
  });

  // Track if we already kicked off startAssessment so React strict mode in dev
  // doesn't fire it twice.
  const startedRef = useRef(false);

  // -------------------------------------------------------------------------
  // Boot: try to resume a persisted run, otherwise start a fresh one.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const activeId = getActive();
    if (activeId) {
      const persisted = readPersisted(activeId);
      if (persisted && persisted.items.length > 0) {
        setState({
          phase: 'answering',
          assessment: {
            id: persisted.assessmentId,
            type: 'BASELINE',
            items: persisted.items,
          },
          answers: persisted.answers,
          index: Math.min(persisted.index, persisted.items.length - 1),
          errorMessage: null,
        });
        return;
      }
    }

    setState((s) => ({ ...s, phase: 'loading' }));
    void (async () => {
      try {
        const assessment = await assessments.startAssessment('BASELINE');
        setActive(assessment.id);
        writePersisted({
          assessmentId: assessment.id,
          items: assessment.items,
          answers: {},
          index: 0,
        });
        setState({
          phase: 'answering',
          assessment,
          answers: {},
          index: 0,
          errorMessage: null,
        });
      } catch (err) {
        setState({
          phase: 'error',
          assessment: null,
          answers: {},
          index: 0,
          errorMessage:
            err instanceof Error
              ? err.message
              : 'Could not start the assessment. Please try again.',
        });
      }
    })();
  }, []);

  // -------------------------------------------------------------------------
  // Persist on every change while answering
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (state.phase !== 'answering' || !state.assessment) return;
    writePersisted({
      assessmentId: state.assessment.id,
      items: state.assessment.items,
      answers: state.answers,
      index: state.index,
    });
  }, [state.phase, state.assessment, state.answers, state.index]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const total = state.assessment?.items.length ?? 0;
  const currentItem: AssessmentItem | undefined = state.assessment?.items[state.index];
  const currentAnswer = currentItem !== undefined ? state.answers[currentItem.id] : undefined;
  const isLast = total > 0 && state.index === total - 1;
  const isFirst = state.index === 0;
  // Direction tracks animation: 1 = forward, -1 = back
  const [direction, setDirection] = useState<1 | -1>(1);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleSelect = useCallback(
    (idx: number) => {
      if (!currentItem) return;
      setState((s) => ({
        ...s,
        answers: { ...s.answers, [currentItem.id]: idx },
      }));
    },
    [currentItem],
  );

  const handleSkip = useCallback(() => {
    if (!currentItem) return;
    // Record -1 in local state to mark skipped; we filter these out on submit
    // because the server schema requires choiceIndex >= 0.
    setState((s) => ({
      ...s,
      answers: { ...s.answers, [currentItem.id]: -1 },
    }));
    // Auto-advance after skip
    setDirection(1);
    setState((s) => ({
      ...s,
      index: Math.min(s.index + 1, (s.assessment?.items.length ?? 1) - 1),
    }));
  }, [currentItem]);

  const handleNext = useCallback(() => {
    if (state.index >= total - 1) return;
    setDirection(1);
    setState((s) => ({ ...s, index: s.index + 1 }));
  }, [state.index, total]);

  const handleBack = useCallback(() => {
    if (state.index <= 0) return;
    setDirection(-1);
    setState((s) => ({ ...s, index: s.index - 1 }));
  }, [state.index]);

  const handleSubmit = useCallback(async () => {
    if (!state.assessment) return;
    setState((s) => ({ ...s, phase: 'submitting', errorMessage: null }));

    // Filter out skipped questions (-1) since the server requires
    // choiceIndex >= 0. Per spec, skipped questions read as wrong on the score
    // because they're missing from the response set.
    const itemResponses = Object.entries(state.answers)
      .filter(([, choice]) => choice >= 0)
      .map(([itemId, choiceIndex]) => ({ itemId, choiceIndex }));

    if (itemResponses.length === 0) {
      setState((s) => ({
        ...s,
        phase: 'answering',
        errorMessage: 'Please answer at least one question before submitting.',
      }));
      return;
    }

    try {
      const result = await assessments.submitAssessment({
        type: 'BASELINE',
        itemResponses,
      });

      // Build a friendly per-level / per-category breakdown for the result
      // page. The server response is intentionally minimal, so we synthesise a
      // useful breakdown from the answers we have. (See result-summary.tsx for
      // how this is rendered.)
      const totalAnswered = itemResponses.length;
      const skipped = state.assessment.items.length - totalAnswered;

      const payload = {
        ...result,
        total: state.assessment.items.length,
        answered: totalAnswered,
        skipped,
        capturedAt: new Date().toISOString(),
      };

      try {
        window.localStorage.setItem(RESULT_KEY, JSON.stringify(payload));
      } catch {
        // ignore quota errors
      }

      clearPersisted(state.assessment.id);
      clearActive();

      setState((s) => ({ ...s, phase: 'done' }));
      router.push('/assessment/result');
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: 'answering',
        errorMessage: err instanceof Error ? err.message : 'Submission failed. Please try again.',
      }));
    }
  }, [router, state.assessment, state.answers]);

  // -------------------------------------------------------------------------
  // Keyboard shortcut: Enter advances when an answer is selected
  // -------------------------------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (state.phase !== 'answering') return;
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'Enter' && currentAnswer !== undefined && currentAnswer >= 0) {
        if (isLast) {
          void handleSubmit();
        } else {
          handleNext();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, currentAnswer, isLast, handleNext, handleSubmit]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const slideClass = useMemo(
    () =>
      direction === 1
        ? 'animate-[slideFromRight_220ms_ease-out]'
        : 'animate-[slideFromLeft_220ms_ease-out]',
    [direction],
  );

  if (state.phase === 'idle' || state.phase === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-paper-500" aria-hidden="true" />
          <MonoLabel>LOADING ASSESSMENT…</MonoLabel>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <MonoLabel tone="danger">ASSESSMENT FAILED</MonoLabel>
            <p className="text-body-sm text-paper-300">{state.errorMessage}</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!state.assessment || !currentItem) {
    return null;
  }

  const isSubmitting = state.phase === 'submitting';
  const canAdvance = currentAnswer !== undefined && currentAnswer >= 0;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-6 sm:py-10">
      {/* Inline keyframes for the slide animation */}
      <style jsx>{`
        @keyframes slideFromRight {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideFromLeft {
          from {
            opacity: 0;
            transform: translateX(-24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <ProgressHeader
        current={state.index + 1}
        total={total}
        estimatedMinutesRemaining={Math.max(1, Math.round((total - state.index) * 0.25))}
      />

      <div className="mt-10 flex-1">
        {state.errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-body-sm text-danger"
          >
            {state.errorMessage}
          </div>
        )}

        <div key={currentItem.id} className={slideClass}>
          <QuestionCard
            question={currentItem}
            selectedIndex={currentAnswer !== undefined && currentAnswer >= 0 ? currentAnswer : null}
            onSelect={handleSelect}
            groupName={`q-${currentItem.id}`}
          />
        </div>

        <div className="mt-8 flex items-center justify-center">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500 transition-colors hover:text-paper-100 disabled:opacity-50"
          >
            <SkipForward size={14} aria-hidden="true" />
            SKIP
          </button>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-ink-600 pt-6">
        <Button variant="ghost" onClick={handleBack} disabled={isFirst || isSubmitting}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Back
        </Button>

        {isLast ? (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canAdvance || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                Scoring…
              </>
            ) : (
              'Submit →'
            )}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canAdvance || isSubmitting}
            className="min-w-[100px]"
          >
            Next
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
