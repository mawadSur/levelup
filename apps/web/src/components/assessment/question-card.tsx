'use client';

import { Check } from 'lucide-react';
import { cn } from '@levelup/ui';

export interface QuestionItem {
  id: string;
  text: string;
  choices: string[];
}

interface QuestionCardProps {
  question: QuestionItem;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  /** Used as the radio input name to keep selection isolated per question. */
  groupName: string;
}

export function QuestionCard({ question, selectedIndex, onSelect, groupName }: QuestionCardProps) {
  return (
    <fieldset className="space-y-5">
      <legend className="block text-balance text-xl font-semibold leading-snug text-foreground sm:text-2xl">
        {question.text}
      </legend>

      <div className="space-y-2.5">
        {question.choices.map((choice, idx) => {
          const isSelected = selectedIndex === idx;
          const inputId = `${groupName}-choice-${idx}`;
          return (
            <label
              key={inputId}
              htmlFor={inputId}
              className={cn(
                'group relative flex cursor-pointer items-start gap-3 rounded-lg border bg-background px-4 py-3.5 text-sm transition-colors',
                'hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20',
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-950/40 dark:ring-indigo-400'
                  : 'border-border',
              )}
            >
              <input
                id={inputId}
                type="radio"
                name={groupName}
                value={idx}
                checked={isSelected}
                onChange={() => onSelect(idx)}
                className="sr-only"
              />
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border transition-colors',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-400'
                    : 'border-input bg-background',
                )}
                aria-hidden="true"
              >
                {isSelected ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span className="flex-1 leading-relaxed text-foreground">{choice}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
