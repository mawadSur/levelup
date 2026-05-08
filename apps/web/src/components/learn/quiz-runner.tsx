'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@levelup/ui';
import { cn } from '@levelup/ui';
import { quizzes } from '@/lib/api';
import type { Quiz, QuizAttempt } from '@/lib/api/quizzes';
import type { QuizAttemptResult } from '@levelup/types';
import { useXpState } from './hud/xp-context';
import { usePostHog } from '@/lib/analytics/posthog-provider';
import { LessonCompletionModal, type XpBreakdownItem } from './hud/lesson-completion-modal';

// ---------------------------------------------------------------------------
// Shared CSS keyframes (injected once via a top-level <style>)
// ---------------------------------------------------------------------------
const QUIZ_KEYFRAMES = `
  @keyframes quiz-correct-bounce {
    0%   { transform: scale(1); }
    45%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes quiz-wrong-shake {
    0%   { transform: translateX(0); }
    16%  { transform: translateX(-4px); }
    33%  { transform: translateX(4px); }
    50%  { transform: translateX(-4px); }
    66%  { transform: translateX(4px); }
    83%  { transform: translateX(-4px); }
    100% { transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .quiz-correct-bounce { animation: none !important; }
    .quiz-wrong-shake    { animation: none !important; }
  }
  .quiz-correct-bounce {
    animation: quiz-correct-bounce 220ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  .quiz-wrong-shake {
    animation: quiz-wrong-shake 480ms linear forwards;
  }
`;

// ---------------------------------------------------------------------------
// Letter labels (A / B / C / D …)
// ---------------------------------------------------------------------------
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function letterLabel(idx: number): string {
  return LETTERS[idx] ?? String(idx + 1);
}

// ---------------------------------------------------------------------------
// Animated result card — bounces on correct, shakes on wrong.
// ---------------------------------------------------------------------------
interface ResultCardProps {
  isCorrect: boolean;
  children: React.ReactNode;
  className?: string;
}

function ResultCard({ isCorrect, children, className }: ResultCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cls = isCorrect ? 'quiz-correct-bounce' : 'quiz-wrong-shake';
    // Re-trigger by removing and re-adding the class
    el.classList.remove('quiz-correct-bounce', 'quiz-wrong-shake');
    // Force reflow
    void el.offsetWidth;
    el.classList.add(cls);
    const id = setTimeout(() => el.classList.remove(cls), 600);
    return () => clearTimeout(id);
  }, [isCorrect]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props & state machine
// ---------------------------------------------------------------------------
interface QuizRunnerProps {
  quiz: Quiz;
  previousAttempts: QuizAttempt[];
  nextLessonHref: string | null;
  /** 0–1 fraction representing how far through the path the learner is. */
  pathProgressPct?: number;
}

type QuizState =
  | { phase: 'idle' }
  | { phase: 'answering'; answers: (number | null)[] }
  | { phase: 'submitting'; answers: number[] }
  | { phase: 'result'; result: QuizAttemptResult; answers: number[] };

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function QuizRunner({
  quiz,
  previousAttempts,
  nextLessonHref,
  pathProgressPct = 0,
}: QuizRunnerProps) {
  const router = useRouter();
  const hasPassed = previousAttempts.some((a) => a.passed);
  const { state: xpState, notifyAction } = useXpState();
  const phog = usePostHog();

  const [state, setState] = useState<QuizState>(() =>
    hasPassed
      ? { phase: 'result', result: buildPassedResult(quiz, previousAttempts), answers: [] }
      : { phase: 'idle' },
  );

  // Lesson completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionBreakdown, setCompletionBreakdown] = useState<XpBreakdownItem[]>([]);
  const [completionTotalXp, setCompletionTotalXp] = useState(0);
  // Track whether this quiz was already passed before this session
  const alreadyPassedRef = useRef(hasPassed);

  function handleStart() {
    setState({ phase: 'answering', answers: Array<null>(quiz.questions.length).fill(null) });
  }

  function handleSelect(questionIdx: number, choiceIdx: number) {
    setState((prev) => {
      if (prev.phase !== 'answering') return prev;
      const next = [...prev.answers];
      next[questionIdx] = choiceIdx;
      return { phase: 'answering', answers: next };
    });
  }

  async function handleSubmit() {
    if (state.phase !== 'answering') return;
    const filled = state.answers.map((a) => (a === null ? 0 : a));
    const allAnswered = state.answers.every((a) => a !== null);
    if (!allAnswered) return; // should be prevented by disabled button

    setState({ phase: 'submitting', answers: filled });

    // Client-side funnel event — fires at click time, before the server
    // responds. The server-side `quiz_attempted` event fires after scoring.
    phog?.capture('quiz_submitted_client', {
      quizId: quiz.id,
      attemptNumber: previousAttempts.length + 1,
    });

    try {
      const result = await quizzes.submitAttempt({
        quizId: quiz.id,
        answers: filled,
      });
      setState({ phase: 'result', result, answers: filled });
      if (result.passed && !alreadyPassedRef.current) {
        // Only show the ceremony on the first-ever pass, not on re-takes.
        alreadyPassedRef.current = true;

        // Compute canonical XP breakdown
        const isFirstTry = previousAttempts.length === 0;
        const streakBonus = xpState && xpState.currentStreak >= 1 ? 5 : 0;
        const breakdown: XpBreakdownItem[] = [
          {
            label: isFirstTry ? 'First-try bonus' : 'Quiz passed',
            xp: isFirstTry ? 30 : 15,
          },
          { label: 'Lesson completed', xp: 25 },
        ];
        if (streakBonus > 0) {
          breakdown.push({ label: 'Streak bonus', xp: streakBonus });
        }
        const totalXp = breakdown.reduce((sum, r) => sum + r.xp, 0);

        setCompletionBreakdown(breakdown);
        setCompletionTotalXp(totalXp);
        setShowCompletionModal(true);

        // Notify context so it re-fetches after backend commits
        notifyAction('quiz');
        router.refresh();
      } else if (result.passed) {
        router.refresh();
      }
    } catch (err) {
      // Reset to answering so user can retry
      setState({ phase: 'answering', answers: filled });
      console.error('Quiz submission failed', err);
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  if (state.phase === 'idle') {
    return (
      <Card id="quiz" className="mt-10">
        <CardHeader>
          <CardTitle className="text-lg">Quick check</CardTitle>
          <p className="text-sm text-paper-300">
            {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} &middot;
            passing score {quiz.passingScore}%
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleStart}>Take the quick check</Button>
        </CardContent>
      </Card>
    );
  }

  if (state.phase === 'answering' || state.phase === 'submitting') {
    const answers = state.answers;
    const allAnswered = answers.every((a) => a !== null);
    const submitting = state.phase === 'submitting';

    // -------------------------------------------------------------------------
    // Keyboard navigation handler for radio groups.
    // Arrow Up/Left → previous choice; Arrow Down/Right → next choice.
    // Enter/Space → select focused choice (browser default for radios, but we
    // reinforce it here since the input is sr-only and the visual target is the
    // <label>).
    // -------------------------------------------------------------------------
    function handleRadioKeyDown(e: React.KeyboardEvent<HTMLInputElement>, qi: number, ci: number) {
      const totalChoices = quiz.questions[qi]?.choices.length ?? 0;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextCi = (ci + 1) % totalChoices;
        handleSelect(qi, nextCi);
        // Move focus to the next radio
        const nextInput = document.querySelector<HTMLInputElement>(
          `input[name="question-${quiz.questions[qi]?.id}"][value="${nextCi}"]`,
        );
        nextInput?.focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevCi = (ci - 1 + totalChoices) % totalChoices;
        handleSelect(qi, prevCi);
        const prevInput = document.querySelector<HTMLInputElement>(
          `input[name="question-${quiz.questions[qi]?.id}"][value="${prevCi}"]`,
        );
        prevInput?.focus();
      }
      // Enter / Space: browser fires onChange on the underlying input naturally —
      // no custom handling needed.
    }

    return (
      <>
        <style>{QUIZ_KEYFRAMES}</style>
        <Card id="quiz" className="mt-10">
          <CardHeader>
            <CardTitle className="text-lg">Quick check</CardTitle>
            <p className="text-sm text-paper-300">
              {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} &middot;
              passing score {quiz.passingScore}%
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            {quiz.questions.map((q, qi) => {
              const promptId = `quiz-prompt-${q.id}`;
              return (
                <fieldset key={q.id} className="space-y-3">
                  {/*
                   * The <legend> is the accessible name for the fieldset /
                   * radiogroup. It must be a direct child of <fieldset> for the
                   * browser to associate it. We visually display the question
                   * text via the <p> below; the legend is sr-only for assistive
                   * technologies that read the fieldset role.
                   */}
                  <legend className="sr-only">
                    {qi + 1}. {q.text}
                  </legend>

                  {/* Visible question text — also provides the aria-labelledby target */}
                  <p
                    id={promptId}
                    className="text-sm font-semibold text-paper-100 leading-snug"
                    aria-hidden="true"
                  >
                    {qi + 1}. {q.text}
                  </p>

                  <div role="radiogroup" aria-labelledby={promptId} className="space-y-2 pl-1">
                    {q.choices.map((choice, ci) => {
                      const isSelected = answers[qi] === ci;
                      const inputId = `quiz-${q.id}-choice-${ci}`;
                      return (
                        <label
                          key={ci}
                          htmlFor={inputId}
                          className={cn(
                            // Base card
                            'relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm',
                            // Transition for selection state
                            'transition-[border-color,box-shadow,transform] duration-[180ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                            isSelected
                              ? [
                                  // Oxblood (primary) selected border, 2px
                                  'border-2 border-signal',
                                  // Soft inner shadow
                                  'shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]',
                                  // Slight scale up
                                  'scale-[1.02]',
                                  'bg-signal/5 font-medium text-signal',
                                ].join(' ')
                              : 'border-ink-600 bg-ink-800 hover:border-signal/40 hover:bg-ink-700/20',
                            submitting && 'pointer-events-none opacity-70',
                          )}
                        >
                          {/* Letter label — Fraunces italic, oxblood, semi-opaque */}
                          <span
                            className={cn(
                              'shrink-0 font-serif italic text-[14px] leading-none',
                              isSelected ? 'text-signal/80' : 'text-signal/40',
                            )}
                            aria-hidden="true"
                          >
                            {letterLabel(ci)}
                          </span>
                          <input
                            id={inputId}
                            type="radio"
                            name={`question-${q.id}`}
                            value={ci}
                            checked={isSelected}
                            onChange={() => handleSelect(qi, ci)}
                            onKeyDown={(e) => handleRadioKeyDown(e, qi, ci)}
                            aria-describedby={promptId}
                            aria-label={`${letterLabel(ci)}: ${choice}`}
                            className={cn(
                              'sr-only',
                              // Expose focus ring on the containing label when
                              // the hidden input is keyboard-focused.
                              // The label itself picks up :focus-within which
                              // we mirror via focus-visible on the input.
                              'focus-visible:not-sr-only focus-visible:absolute focus-visible:inset-0 focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2',
                            )}
                            disabled={submitting}
                          />
                          <span>{choice}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}

            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? 'Submitting…' : 'Submit answers'}
              </Button>
              {!allAnswered && (
                <p className="mt-2 text-xs text-paper-300">Answer all questions to submit.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // phase === 'result'
  const { result, answers } = state;
  const passed = result.passed;
  // SEV-17: correctAnswers is omitted from the API response on a failing
  // attempt until the user has burned MAX_ATTEMPTS_BEFORE_REVEAL (currently 3)
  // failed attempts. When undefined, we render a stripped-down "score only"
  // result and a Try-again CTA. When present (passed OR exhausted), we render
  // the full per-question breakdown.
  const detailedFeedbackAvailable = result.correctAnswers !== undefined;

  return (
    <>
      {/* Lesson completion ceremony modal */}
      <LessonCompletionModal
        open={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        xpBreakdown={completionBreakdown}
        totalXp={completionTotalXp}
        pathProgressPct={pathProgressPct}
        nextLessonHref={nextLessonHref ?? undefined}
      />
      <style>{QUIZ_KEYFRAMES}</style>
      <Card
        id="quiz"
        className={cn('mt-10 border-2', passed ? 'border-success/50' : 'border-danger/40')}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-lg',
                passed ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
              )}
              aria-hidden="true"
            >
              {passed ? '✓' : '✗'}
            </div>
            <div>
              <CardTitle className="text-lg">
                {passed ? 'Lesson complete!' : 'Not quite — review and try again'}
              </CardTitle>
              <p className="text-sm text-paper-300">
                Score: <span className="font-semibold">{result.score}%</span> (passing:{' '}
                {quiz.passingScore}%)
              </p>
            </div>
          </div>
        </CardHeader>

        {/*
         * role="status" + aria-live="polite" — when this panel renders (after
         * submission), screen readers announce the result without interrupting
         * the user's current focus. The summary text "Lesson complete!" or
         * "Not quite — review and try again" in the CardTitle provides the
         * primary announcement; the per-question breakdown is then browseable.
         */}
        <CardContent className="space-y-6" role="status" aria-live="polite">
          {detailedFeedbackAvailable ? (
            <>
              {/* Per-question breakdown — rendered when answers are revealed */}
              {quiz.questions.map((q, qi) => {
                const chosen = answers[qi] ?? 0;
                const correctIdx = result.correctAnswers?.[qi];
                const isCorrect = correctIdx !== undefined && chosen === correctIdx;

                return (
                  <ResultCard key={q.id} isCorrect={isCorrect} className="space-y-2">
                    <p className="text-sm font-semibold leading-snug text-paper-100">
                      {qi + 1}. {q.text}
                      <Badge
                        variant={isCorrect ? 'default' : 'destructive'}
                        className="ml-2 text-xs"
                      >
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </p>
                    <div className="space-y-1.5 pl-1">
                      {q.choices.map((choice, ci) => {
                        const wasChosen = chosen === ci;
                        const isTheCorrectAnswer = correctIdx === ci;
                        const isCorrectChoice = wasChosen && isTheCorrectAnswer;
                        const isWrongChoice = wasChosen && !isTheCorrectAnswer;

                        // Build a screen-reader label that communicates the
                        // correctness state alongside the choice text.
                        const choiceAriaLabel = [
                          `${letterLabel(ci)}: ${choice}`,
                          isCorrectChoice
                            ? '— your answer, correct'
                            : isWrongChoice
                              ? '— your answer, incorrect'
                              : isTheCorrectAnswer
                                ? '— correct answer'
                                : '',
                        ]
                          .filter(Boolean)
                          .join(' ');

                        return (
                          <div
                            key={ci}
                            aria-label={choiceAriaLabel}
                            className={cn(
                              'flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm',
                              isCorrectChoice &&
                                [
                                  'border-signal bg-signal/5 text-signal',
                                  'transition-colors duration-150',
                                ].join(' '),
                              isWrongChoice &&
                                [
                                  'border-accent-warm bg-ink-700-warm/10 text-paper-100',
                                  'transition-colors duration-150',
                                ].join(' '),
                              !wasChosen && 'border-ink-600 bg-transparent text-paper-300',
                            )}
                          >
                            {/* Letter label in result view */}
                            <span
                              className={cn(
                                'shrink-0 font-serif italic text-[13px] leading-none',
                                isCorrectChoice ? 'text-signal/70' : 'text-paper-300/50',
                              )}
                              aria-hidden="true"
                            >
                              {letterLabel(ci)}
                            </span>
                            <span className="shrink-0 font-mono text-xs" aria-hidden="true">
                              {isCorrectChoice ? '✓' : isWrongChoice ? '✗' : '·'}
                            </span>
                            <span aria-hidden="true">{choice}</span>
                          </div>
                        );
                      })}
                    </div>
                  </ResultCard>
                );
              })}
            </>
          ) : (
            /* Failing attempt with answers withheld — show overall score only */
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm">
              <p className="font-medium text-paper-100">Review the lesson and try again.</p>
              {typeof result.attemptsRemaining === 'number' && result.attemptsRemaining > 0 && (
                <p className="mt-1 text-paper-300">
                  {result.attemptsRemaining} attempt
                  {result.attemptsRemaining === 1 ? '' : 's'} before we reveal the answers.
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {passed ? (
              nextLessonHref ? (
                <Button asChild>
                  <a href={nextLessonHref}>Next lesson &rarr;</a>
                </Button>
              ) : (
                <Badge variant="default" className="text-sm px-3 py-1.5">
                  Path complete!
                </Badge>
              )
            ) : (
              <Button variant="outline" onClick={handleStart}>
                Try again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function buildPassedResult(quiz: Quiz, attempts: QuizAttempt[]): QuizAttemptResult {
  const best = attempts.reduce<QuizAttempt | null>((acc, a) => {
    if (!acc) return a;
    return a.score > acc.score ? a : acc;
  }, null);

  // We don't have the per-question answer key on the historical-attempts API,
  // so we fabricate one where each question's "correct" choice is the user's
  // selected choice — this paints every option as correct in the read-only
  // history view, which matches the previous behavior. Detailed feedback is
  // only ever exposed when the live submitAttempt call returns it (gated by
  // SEV-17 reveal rules on the server).
  return {
    attemptId: best?.id ?? '',
    score: best?.score ?? 100,
    total: quiz.questions.length,
    passed: true,
    attemptsRemaining: null,
    correctAnswers: quiz.questions.map(() => 0),
  };
}
