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
      className="group flex w-full items-start gap-3 rounded-lg border bg-ink-900 p-4 text-left text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:hover:border-indigo-700"
    >
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-indigo-100 text-indigo-600 transition-colors group-hover:bg-indigo-500 group-hover:text-white dark:bg-indigo-950/50 dark:text-indigo-300">
        <Sparkles size={14} aria-hidden="true" />
      </span>
      <span className="flex-1 leading-relaxed text-paper-100">{text}</span>
    </button>
  );
}
