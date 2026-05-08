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
    <fieldset className="space-y-6">
      <legend className="block text-balance font-serif text-h1 italic leading-snug text-paper-100 sm:text-display-md">
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
                'group relative flex cursor-pointer items-start gap-3 rounded-sm border bg-ink-900 px-4 py-3.5 text-body-sm transition-colors',
                'hover:border-signal/55 hover:bg-ink-800',
                isSelected ? 'border-signal bg-ink-800 ring-1 ring-signal' : 'border-ink-600',
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
                  'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-data border transition-colors',
                  isSelected ? 'border-signal bg-signal text-ink-900' : 'border-ink-500 bg-ink-900',
                )}
                aria-hidden="true"
              >
                {isSelected ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span className="flex-1 leading-relaxed text-paper-100">{choice}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
