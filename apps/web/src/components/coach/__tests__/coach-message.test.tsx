/**
 * coach-message.test.tsx
 *
 * Tests for CoachMessage (apps/web/src/components/coach/coach-message.tsx).
 *
 * These are mostly prop-driven visual tests — no network calls are needed.
 * We mock @levelup/ui's toast to verify it is called, and stub the clipboard
 * API for the Copy button.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { CoachMessage } from '../coach-message';
import type { UserMessage, AssistantMessage } from '../coach-message';

// ---------------------------------------------------------------------------
// Mock @levelup/ui toast (CoachMessage calls toast.success / toast.error via
// the copy button, and onSavePrompt is a passed-in callback)
// ---------------------------------------------------------------------------
vi.mock('@levelup/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@levelup/ui')>();
  return {
    ...original,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_MSG: UserMessage = {
  id: 'msg-1',
  role: 'user',
  content: 'How do I write a better prompt?',
};

function makeAssistantMsg(overrides?: Partial<AssistantMessage>): AssistantMessage {
  return {
    id: 'msg-2',
    role: 'assistant',
    explanation: 'Great question! Start with context.',
    improvedPrompt: '',
    whyItWorks: '',
    nextAction: '',
    isStreaming: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CoachMessage', () => {
  const onSavePrompt = vi.fn();
  const onRetry = vi.fn();

  beforeEach(() => {
    onSavePrompt.mockReset();
    onRetry.mockReset();
    // Stub clipboard — navigator.clipboard is read-only in jsdom, so use defineProperty
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  it('renders user message right-aligned with the message content', () => {
    renderWithProviders(
      <CoachMessage message={USER_MSG} canShare={false} onSavePrompt={onSavePrompt} />,
    );

    expect(screen.getByText('How do I write a better prompt?')).toBeInTheDocument();

    // The outer wrapper has justify-end (flex justify-end)
    const wrapper = screen
      .getByText('How do I write a better prompt?')
      .closest('[class*="justify-end"]');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders assistant message with the explanation text', () => {
    renderWithProviders(
      <CoachMessage message={makeAssistantMsg()} canShare={false} onSavePrompt={onSavePrompt} />,
    );

    expect(screen.getByText(/great question! start with context\./i)).toBeInTheDocument();
  });

  it('"Try this prompt instead" section appears only when improvedPrompt is set', () => {
    // Without improved prompt
    const { rerender } = renderWithProviders(
      <CoachMessage
        message={makeAssistantMsg({ improvedPrompt: '' })}
        canShare={false}
        onSavePrompt={onSavePrompt}
      />,
    );
    expect(screen.queryByText(/try this prompt instead/i)).not.toBeInTheDocument();

    // With improved prompt
    rerender(
      <CoachMessage
        message={makeAssistantMsg({
          improvedPrompt: 'You are an expert. Write a concise response.',
        })}
        canShare={false}
        onSavePrompt={onSavePrompt}
      />,
    );
    expect(screen.getByText(/try this prompt instead/i)).toBeInTheDocument();
  });

  it('"Save to library" button calls onSavePrompt with the improved prompt text', async () => {
    const improvedPrompt = 'You are an expert. Write a concise response.';
    renderWithProviders(
      <CoachMessage
        message={makeAssistantMsg({ improvedPrompt })}
        canShare={false}
        onSavePrompt={onSavePrompt}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /save to library/i }));

    await waitFor(() => {
      expect(onSavePrompt).toHaveBeenCalledWith(improvedPrompt);
    });
  });

  it('sensitive-data warning banner renders when sensitiveDataWarning.triggered is true', () => {
    renderWithProviders(
      <CoachMessage
        message={makeAssistantMsg({
          sensitiveDataWarning: {
            triggered: true,
            reason: 'Your prompt contains a potential API key.',
          },
        })}
        canShare={false}
        onSavePrompt={onSavePrompt}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/sensitive data detected/i)).toBeInTheDocument();
    expect(screen.getByText(/your prompt contains a potential api key/i)).toBeInTheDocument();
  });

  it('sensitive-data warning banner is absent when triggered is false', () => {
    renderWithProviders(
      <CoachMessage
        message={makeAssistantMsg({
          sensitiveDataWarning: { triggered: false },
        })}
        canShare={false}
        onSavePrompt={onSavePrompt}
      />,
    );

    expect(screen.queryByText(/sensitive data detected/i)).not.toBeInTheDocument();
  });
});
