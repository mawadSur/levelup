'use client';

import { Sparkles } from 'lucide-react';

interface PromptSuggestionCardProps {
  text: string;
  onPick: (text: string) => void;
}

/**
 * Marked 'use client' because it needs an onClick handler. Visually it's a
 * compact, tappable card.
 */
export function PromptSuggestionCard({ text, onPick }: PromptSuggestionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onPick(text)}
      className="group flex w-full items-start gap-3 rounded-lg border bg-ink-900 p-4 text-left text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-signal/35 hover:shadow-md dark:hover:border-signal-dim"
    >
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-signal/15 text-signal transition-colors group-hover:bg-signal group-hover:text-white dark:bg-ink-800/50 dark:text-signal">
        <Sparkles size={14} aria-hidden="true" />
      </span>
      <span className="flex-1 leading-relaxed text-paper-100">{text}</span>
    </button>
  );
}
