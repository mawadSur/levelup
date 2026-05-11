/**
 * quiz-runner.test.tsx
 *
 * Tests for QuizRunner (apps/web/src/components/learn/quiz-runner.tsx).
 *
 * quizzes.submitAttempt is mocked via vi.mock('@/lib/api') so tests control
 * every API response without touching MSW (the quiz runner calls the typed
 * API module, not raw fetch).
 *
 * next/navigation and the XpProvider are also mocked — the runner only needs
 * router.push/refresh and notifyAction from xp-context.
 *
 * Component details (from source):
 * - Idle state: shows Card with title "Quick check" + button "Take the quick check".
 * - Answering state: question text in sr-only <legend> (findable by RTL) and
 *   in <p aria-hidden>. Each radio has aria-label="<Letter>: <choice text>".
 * - Result state passed: shows "Lesson complete!".
 * - Result state failed (no correctAnswers): shows score-only + "{n} attempts before we reveal".
 * - Result state failed (correctAnswers present): shows "Correct"/"Incorrect" badges.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { QuizRunner } from '../quiz-runner';
import type { Quiz, QuizAttempt } from '@/lib/api/quizzes';
import type { QuizAttemptResult } from '@levelup/types';
import type * as LibApiModule from '@/lib/api';

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
const mockRouterRefresh = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    refresh: mockRouterRefresh,
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock xp-context
// ---------------------------------------------------------------------------
vi.mock('@/components/learn/hud/xp-context', () => ({
  useXpState: () => ({
    state: null,
    loading: false,
    notifyAction: vi.fn(),
    refresh: vi.fn(),
    pendingLevelUp: false,
    newLevel: 0,
    consumePendingLevelUp: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock LessonCompletionModal — renders nothing, we don't test it here
// ---------------------------------------------------------------------------
vi.mock('@/components/learn/hud/lesson-completion-modal', () => ({
  LessonCompletionModal: () => null,
}));

// ---------------------------------------------------------------------------
// Mock quizzes API
// ---------------------------------------------------------------------------
const mockSubmitAttempt =
  vi.fn<
    (
      input: Parameters<(typeof LibApiModule)['quizzes']['submitAttempt']>[0],
    ) => Promise<QuizAttemptResult>
  >();

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof LibApiModule>();
  return {
    ...original,
    quizzes: {
      ...original.quizzes,
      submitAttempt: (input: Parameters<typeof original.quizzes.submitAttempt>[0]) =>
        mockSubmitAttempt(input),
    },
  };
});

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const QUIZ: Quiz = {
  id: 'q1',
  lessonId: 'lesson-1',
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      text: 'What is the capital of France?',
      choices: ['Berlin', 'Madrid', 'Paris', 'Rome'],
    },
    {
      id: 'q2',
      text: 'Which planet is closest to the sun?',
      choices: ['Earth', 'Venus', 'Mercury', 'Mars'],
    },
  ],
};

const NO_ATTEMPTS: QuizAttempt[] = [];

function renderRunner(
  opts?: Partial<{
    quiz: Quiz;
    previousAttempts: QuizAttempt[];
    nextLessonHref: string | null;
  }>,
) {
  return renderWithProviders(
    <QuizRunner
      quiz={opts?.quiz ?? QUIZ}
      previousAttempts={opts?.previousAttempts ?? NO_ATTEMPTS}
      nextLessonHref={opts?.nextLessonHref ?? '/learn/next-lesson'}
    />,
  );
}

// ---------------------------------------------------------------------------
// Helpers: select a radio by choice text (radio has aria-label="<Letter>: <text>")
// ---------------------------------------------------------------------------
function getRadioByChoice(text: string) {
  // Radio inputs have aria-label like "A: Berlin", "C: Paris", etc.
  return screen.getByRole('radio', { name: new RegExp(`:\\s*${text}$`, 'i') });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuizRunner', () => {
  beforeEach(() => {
    mockSubmitAttempt.mockReset();
    mockRouterRefresh.mockReset();
    mockRouterPush.mockReset();
  });

  it('renders the quiz card with a "Take the quick check" button in idle state', () => {
    renderRunner();
    // Title heading
    expect(screen.getByRole('heading', { name: /quick check/i })).toBeInTheDocument();
    // Start button
    expect(screen.getByRole('button', { name: /take the quick check/i })).toBeInTheDocument();
  });

  it('after starting, shows all questions with their choices', async () => {
    renderRunner();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /take the quick check/i }));

    // Question text appears in the sr-only <legend>
    await waitFor(() => {
      // The legend contains "1. What is the capital of France?"
      const legends = screen.getAllByText(/what is the capital of france/i);
      expect(legends.length).toBeGreaterThanOrEqual(1);
    });

    // All four choices for Q1 are present as radio inputs
    expect(getRadioByChoice('Berlin')).toBeInTheDocument();
    expect(getRadioByChoice('Paris')).toBeInTheDocument();
    // Q2 choices
    expect(getRadioByChoice('Mercury')).toBeInTheDocument();
  });

  it('selecting a choice marks the radio as checked', async () => {
    renderRunner();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /take the quick check/i }));

    await waitFor(() => {
      expect(getRadioByChoice('Berlin')).toBeInTheDocument();
    });

    const parisRadio = getRadioByChoice('Paris');
    await user.click(parisRadio);

    await waitFor(() => {
      expect(parisRadio).toBeChecked();
    });
  });

  it('Submit is disabled until all questions are answered', async () => {
    renderRunner();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /take the quick check/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit answers/i })).toBeDisabled();
    });

    // Answer only the first question
    await user.click(getRadioByChoice('Paris'));

    // Still disabled — second question unanswered
    expect(screen.getByRole('button', { name: /submit answers/i })).toBeDisabled();
  });

  it('Submit calls submitAttempt with chosen answers', async () => {
    const result: QuizAttemptResult = {
      attemptId: 'att-1',
      score: 100,
      total: 2,
      passed: true,
      attemptsRemaining: null,
      correctAnswers: [2, 2],
    };
    mockSubmitAttempt.mockResolvedValueOnce(result);

    renderRunner();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /take the quick check/i }));

    await waitFor(() => expect(getRadioByChoice('Paris')).toBeInTheDocument());

    // Q1: Paris = index 2, Q2: Mercury = index 2
    await user.click(getRadioByChoice('Paris'));
    await user.click(getRadioByChoice('Mercury'));

    const submitBtn = screen.getByRole('button', { name: /submit answers/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmitAttempt).toHaveBeenCalledWith({
        quizId: 'q1',
        answers: [2, 2],
      });
    });
  });

  it('shows "Lesson complete!" on passed: true response', async () => {
    const result: QuizAttemptResult = {
      attemptId: 'att-2',
      score: 100,
      total: 2,
      passed: true,
      attemptsRemaining: null,
      correctAnswers: [2, 2],
    };
    mockSubmitAttempt.mockResolvedValueOnce(result);

    renderRunner();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /take the quick check/i }));
    await waitFor(() => expect(getRadioByChoice('Paris')).toBeInTheDocument());

    await user.click(getRadioByChoice('Paris'));
    await user.click(getRadioByChoice('Mercury'));
    await user.click(await waitFor(() => screen.getByRole('button', { name: /submit answers/i })));

    await waitFor(() => {
      expect(screen.getByText(/lesson complete!/i)).toBeInTheDocument();
    });
  });

  it('shows score-only view with attempts-remaining message on failed attempt (answers withheld)', async () => {
    const result: QuizAttemptResult = {
      attemptId: 'att-3',
      score: 50,
      total: 2,
      passed: false,
      attemptsRemaining: 2,
      // correctAnswers omitted — server withholds them per SEV-17
    };
    mockSubmitAttempt.mockResolvedValueOnce(result);

    renderRunner();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /take the quick check/i }));
    await waitFor(() => expect(getRadioByChoice('Berlin')).toBeInTheDocument());

    await user.click(getRadioByChoice('Berlin'));
    await user.click(getRadioByChoice('Earth'));

    await user.click(await waitFor(() => screen.getByRole('button', { name: /submit answers/i })));

    await waitFor(() => {
      expect(screen.getByText(/2 attempts before we reveal/i)).toBeInTheDocument();
    });
    // No per-question "Correct" / "Incorrect" badges visible
    expect(screen.queryByText(/^incorrect$/i)).not.toBeInTheDocument();
  });

  it('shows full per-question feedback when attemptsRemaining is 0 and correctAnswers are present', async () => {
    const result: QuizAttemptResult = {
      attemptId: 'att-4',
      score: 50,
      total: 2,
      passed: false,
      attemptsRemaining: 0,
      correctAnswers: [2, 2],
    };
    mockSubmitAttempt.mockResolvedValueOnce(result);

    renderRunner();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /take the quick check/i }));
    await waitFor(() => expect(getRadioByChoice('Berlin')).toBeInTheDocument());

    await user.click(getRadioByChoice('Berlin'));
    await user.click(getRadioByChoice('Earth'));

    await user.click(await waitFor(() => screen.getByRole('button', { name: /submit answers/i })));

    await waitFor(() => {
      // Detailed feedback renders Correct/Incorrect badges
      const incorrectBadges = screen.getAllByText(/incorrect/i);
      expect(incorrectBadges.length).toBeGreaterThanOrEqual(1);
    });
  });
});
