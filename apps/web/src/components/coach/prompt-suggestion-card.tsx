'use client';

import { ArrowRight } from 'lucide-react';
import { MonoLabel } from '@levelup/ui';

interface PromptSuggestionCardProps {
  text: string;
  onPick: (text: string) => void;
}

/**
 * Mission-Brief example prompt card. Categorical mono label + body, with a
 * subtle arrow on hover. Used in the empty-state grid above the composer.
 */
export function PromptSuggestionCard({ text, onPick }: PromptSuggestionCardProps) {
  // Derive a category from the leading verb (best-effort, used as a mono label).
  const firstWord = text.split(/[\s.]/)[0]?.toUpperCase() ?? 'PROMPT';
  return (
    <button
      type="button"
      onClick={() => onPick(text)}
      className="group flex w-full flex-col gap-2 rounded-md border border-ink-600 bg-ink-800 p-4 text-left text-body-sm transition-colors duration-150 ease-mission hover:border-signal-dim"
    >
      <div className="flex items-center justify-between">
        <MonoLabel>{firstWord}</MonoLabel>
        <ArrowRight
          className="h-3.5 w-3.5 text-paper-500 transition-transform group-hover:translate-x-0.5 group-hover:text-signal"
          aria-hidden="true"
        />
      </div>
      <span className="text-paper-100">{text}</span>
    </button>
  );
}
