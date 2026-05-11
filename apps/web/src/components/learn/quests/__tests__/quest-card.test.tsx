/**
 * quest-card.test.tsx
 *
 * Tests for QuestCard (apps/web/src/components/learn/quests/quest-card.tsx).
 *
 * All tests are prop-driven. The `onClaim` callback is a vi.fn() so we can
 * assert it is called with the right slug.  @levelup/ui toast is mocked so
 * we can verify the success toast is fired after a claim.
 *
 * motion/react works fine in jsdom without any special configuration.
 * useReducedMotion is mocked to return false (animations enabled) so we
 * exercise the normal code path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { QuestCard } from '../quest-card';
import type * as LevelupUiModule from '@levelup/ui';
import type { DailyQuestItem } from '@levelup/types';

// ---------------------------------------------------------------------------
// Mock @levelup/ui toast
// vi.hoisted ensures mockToast is initialized before the hoisted vi.mock call.
// ---------------------------------------------------------------------------
const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock('@levelup/ui', async (importOriginal) => {
  const original = await importOriginal<typeof LevelupUiModule>();
  return {
    ...original,
    toast: mockToast,
  };
});

// ---------------------------------------------------------------------------
// Mock use-reduced-motion so animations are always enabled in tests
// ---------------------------------------------------------------------------
vi.mock('@/lib/motion/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeQuest(overrides?: Partial<DailyQuestItem>): DailyQuestItem {
  return {
    slug: 'daily-lesson',
    title: 'Complete a lesson',
    kind: 'lesson',
    target: 3,
    progress: 1,
    claimed: false,
    xpReward: 50,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuestCard', () => {
  const onClaim = vi.fn<(slug: string) => Promise<void>>();

  beforeEach(() => {
    onClaim.mockReset();
    mockToast.mockReset();
  });

  it('renders title and progress bar when progress < target', () => {
    renderWithProviders(<QuestCard quest={makeQuest()} onClaim={onClaim} />);

    expect(screen.getByText('Complete a lesson')).toBeInTheDocument();
    // Progress bar: aria-label contains "% complete"
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
  });

  it('shows "Claim +N XP" button when progress >= target and not yet claimed', () => {
    renderWithProviders(
      <QuestCard quest={makeQuest({ progress: 3, target: 3, claimed: false })} onClaim={onClaim} />,
    );

    // The button has aria-label="Claim 50 XP for "..."" (no + in aria-label)
    expect(screen.getByRole('button', { name: /claim 50 xp/i })).toBeInTheDocument();
    // No progress bar in this state
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows "Claimed" state with check icon when claimed is true', () => {
    renderWithProviders(
      <QuestCard quest={makeQuest({ progress: 3, claimed: true })} onClaim={onClaim} />,
    );

    expect(screen.getByText(/claimed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
  });

  it('clicking Claim calls onClaim with the quest slug and shows a toast on success', async () => {
    onClaim.mockResolvedValueOnce(undefined);

    renderWithProviders(
      <QuestCard quest={makeQuest({ progress: 3, target: 3, claimed: false })} onClaim={onClaim} />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /claim 50 xp/i }));

    await waitFor(() => {
      expect(onClaim).toHaveBeenCalledWith('daily-lesson');
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: '+50 XP' }));
    });
  });

  it('shows a destructive toast when onClaim rejects', async () => {
    onClaim.mockRejectedValueOnce(new Error('server error'));

    renderWithProviders(
      <QuestCard quest={makeQuest({ progress: 3, target: 3, claimed: false })} onClaim={onClaim} />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /claim 50 xp/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
