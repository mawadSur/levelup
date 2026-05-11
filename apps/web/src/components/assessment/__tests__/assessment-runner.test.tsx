/**
 * assessment-runner.test.tsx
 *
 * Tests for AssessmentRunner (apps/web/src/components/assessment/assessment-runner.tsx).
 *
 * The component calls assessments.startAssessment / submitAssessment from
 * @/lib/api.  We mock the api module directly so Zod validation is bypassed
 * in tests (the server response would normally contain real cuid IDs, etc.).
 *
 * localStorage is available in jsdom; we reset it between tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { AssessmentRunner } from '../assessment-runner';
import type * as LibApiModule from '@/lib/api';
import type { Assessment, AssessmentItem } from '@/lib/api/assessments';
import type { AssessmentResult } from '@levelup/types';

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock assessments API
// ---------------------------------------------------------------------------
const mockStartAssessment = vi.fn<(type: string) => Promise<Assessment>>();
const mockSubmitAssessment =
  vi.fn<
    (
      input: Parameters<(typeof LibApiModule)['assessments']['submitAssessment']>[0],
    ) => Promise<AssessmentResult>
  >();

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof LibApiModule>();
  return {
    ...original,
    assessments: {
      ...original.assessments,
      startAssessment: (type: string) => mockStartAssessment(type),
      submitAssessment: (input: Parameters<typeof original.assessments.submitAssessment>[0]) =>
        mockSubmitAssessment(input),
    },
  };
});

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const ITEMS: AssessmentItem[] = [
  {
    id: 'item-1',
    text: 'What does AI stand for?',
    choices: ['Artificial Intelligence', 'Auto Input', 'Active Interface', 'Augmented Insight'],
  },
  {
    id: 'item-2',
    text: 'Which model is a language model?',
    choices: ['ResNet', 'GPT-4', 'AlexNet', 'YOLO'],
  },
];

const ASSESSMENT: Assessment = {
  id: 'assess-1',
  type: 'BASELINE',
  items: ITEMS,
};

const ASSESSMENT_RESULT: AssessmentResult = {
  assessmentId: 'assess-1',
  score: 80,
  total: 30,
  scoreByLevel: {
    BEGINNER: 90,
    PRACTITIONER: 75,
    POWER_USER: 40,
    CHAMPION: 20,
  },
  recommendedLevel: 'PRACTITIONER',
};

// ---------------------------------------------------------------------------
// localStorage mock — jsdom in vitest may not expose a full Storage object on
// window.  We stub it with a simple Map-backed implementation so the component
// can exercise its persistence logic without relying on jsdom internals.
// ---------------------------------------------------------------------------

const localStorageStore = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore.set(key, value);
  },
  removeItem: (key: string) => {
    localStorageStore.delete(key);
  },
  clear: () => {
    localStorageStore.clear();
  },
  key: (index: number) => Array.from(localStorageStore.keys())[index] ?? null,
  get length() {
    return localStorageStore.size;
  },
};

vi.stubGlobal('localStorage', localStorageMock);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = `levelup-assessment-${ASSESSMENT.id}`;
const ACTIVE_KEY = 'levelup-assessment-active-id';

function clearStorage() {
  localStorageStore.clear();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AssessmentRunner', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearStorage();
  });

  it('on mount calls startAssessment and renders the first question', async () => {
    mockStartAssessment.mockResolvedValueOnce(ASSESSMENT);

    renderWithProviders(<AssessmentRunner />);

    // While loading, should show spinner
    expect(screen.getByText(/loading your assessment/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('What does AI stand for?')).toBeInTheDocument();
    });
    expect(mockStartAssessment).toHaveBeenCalledWith('BASELINE');
  });

  it('clicking a choice highlights it and enables the Next button', async () => {
    mockStartAssessment.mockResolvedValueOnce(ASSESSMENT);

    renderWithProviders(<AssessmentRunner />);

    await waitFor(() => expect(screen.getByText('What does AI stand for?')).toBeInTheDocument());

    const user = userEvent.setup();
    const choice = screen.getByRole('radio', { name: /Artificial Intelligence/i });
    await user.click(choice);

    await waitFor(() => expect(choice).toBeChecked());

    // Next button should now be enabled
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('pressing Next advances to the second question', async () => {
    mockStartAssessment.mockResolvedValueOnce(ASSESSMENT);

    renderWithProviders(<AssessmentRunner />);

    await waitFor(() => expect(screen.getByText('What does AI stand for?')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: /Artificial Intelligence/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled());
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Which model is a language model?')).toBeInTheDocument();
    });
  });

  it('on the final question, Submit navigates to the result page', async () => {
    mockStartAssessment.mockResolvedValueOnce(ASSESSMENT);
    mockSubmitAssessment.mockResolvedValueOnce(ASSESSMENT_RESULT);

    renderWithProviders(<AssessmentRunner />);

    await waitFor(() => expect(screen.getByText('What does AI stand for?')).toBeInTheDocument());

    const user = userEvent.setup();

    // Q1
    await user.click(screen.getByRole('radio', { name: /Artificial Intelligence/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled());
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Q2
    await waitFor(() =>
      expect(screen.getByText('Which model is a language model?')).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('radio', { name: /GPT-4/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /submit/i })).not.toBeDisabled());
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/assessment/result');
    });
  });

  it('auto-saves answers to localStorage after a choice is selected', async () => {
    mockStartAssessment.mockResolvedValueOnce(ASSESSMENT);

    renderWithProviders(<AssessmentRunner />);

    await waitFor(() => expect(screen.getByText('What does AI stand for?')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: /Artificial Intelligence/i }));

    await waitFor(() => {
      const raw = localStorageMock.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const saved = JSON.parse(raw!) as { answers: Record<string, number> };
      expect(saved.answers['item-1']).toBe(0);
    });
  });

  it('rehydrates state from localStorage on remount', async () => {
    // Pre-seed localStorage as if the user partially completed the assessment
    const persisted = {
      assessmentId: ASSESSMENT.id,
      items: ITEMS,
      answers: { 'item-1': 0 },
      index: 1,
    };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(persisted));
    localStorageMock.setItem(ACTIVE_KEY, ASSESSMENT.id);

    renderWithProviders(<AssessmentRunner />);

    // Should jump straight to Q2 (index 1) without calling startAssessment
    await waitFor(() => {
      expect(screen.getByText('Which model is a language model?')).toBeInTheDocument();
    });
    expect(mockStartAssessment).not.toHaveBeenCalled();
  });
});
