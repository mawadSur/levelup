'use client';

/**
 * QuizEditor — inline quiz editor for the manual path editor.
 *
 * Renders 1-3 questions (the AI builder always produces 3 per lesson; the
 * editor allows the admin to add or remove up to 10). Each question has:
 *   - prompt textarea
 *   - 4 choice inputs
 *   - correctIndex radio buttons
 *   - explanation textarea
 */

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Label, Textarea } from '@levelup/ui';
import type { BulkQuiz, BulkQuizQuestion } from '@/lib/api/paths';

interface QuizEditorProps {
  quiz: BulkQuiz;
  onChange: (quiz: BulkQuiz) => void;
}

const EMPTY_QUESTION: BulkQuizQuestion = {
  prompt: '',
  choices: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
  orderIndex: 0,
};

export function QuizEditor({ quiz, onChange }: QuizEditorProps) {
  function updateTitle(title: string) {
    onChange({ ...quiz, title });
  }

  function updateQuestion(index: number, patch: Partial<BulkQuizQuestion>) {
    const questions = quiz.questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
    onChange({ ...quiz, questions });
  }

  function addQuestion() {
    if (quiz.questions.length >= 10) return;
    const newQ: BulkQuizQuestion = {
      ...EMPTY_QUESTION,
      orderIndex: quiz.questions.length,
    };
    onChange({ ...quiz, questions: [...quiz.questions, newQ] });
  }

  function removeQuestion(index: number) {
    const questions = quiz.questions
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, orderIndex: i }));
    onChange({ ...quiz, questions });
  }

  function updateChoice(questionIndex: number, choiceIndex: number, value: string) {
    const q = quiz.questions[questionIndex];
    if (!q) return;
    const choices = q.choices.map((c, i) => (i === choiceIndex ? value : c));
    updateQuestion(questionIndex, { choices });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="qe-title" className="text-xs font-semibold">
          Quiz title
        </Label>
        <Input
          id="qe-title"
          value={quiz.title}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="Quiz title"
          maxLength={200}
          className="text-sm"
        />
      </div>

      <div className="space-y-4">
        {quiz.questions.map((question, qi) => (
          <div key={qi} className="space-y-3 rounded-lg border border-ink-600 bg-ink-700/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="mt-1 text-xs font-mono text-paper-300">Q{qi + 1}</span>
              <div className="flex-1">
                <Textarea
                  rows={2}
                  value={question.prompt}
                  onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                  placeholder="Question prompt"
                  className="text-sm"
                />
              </div>
              {quiz.questions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-danger hover:text-danger"
                  onClick={() => removeQuestion(qi)}
                  aria-label="Remove question"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-paper-300">
                Choices — select the correct answer
              </p>
              {question.choices.map((choice, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={question.correctIndex === ci}
                    onChange={() => updateQuestion(qi, { correctIndex: ci })}
                    className="h-3.5 w-3.5 shrink-0 accent-signal"
                    aria-label={`Choice ${ci + 1} is correct`}
                  />
                  <Input
                    value={choice}
                    onChange={(e) => updateChoice(qi, ci, e.target.value)}
                    placeholder={`Choice ${ci + 1}`}
                    className="h-7 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Explanation (optional)</Label>
              <Textarea
                rows={2}
                value={question.explanation ?? ''}
                onChange={(e) => updateQuestion(qi, { explanation: e.target.value || null })}
                placeholder="Explain why this answer is correct…"
                className="text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {quiz.questions.length < 10 && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addQuestion}>
          <Plus className="h-3.5 w-3.5" />
          Add question
        </Button>
      )}
    </div>
  );
}
