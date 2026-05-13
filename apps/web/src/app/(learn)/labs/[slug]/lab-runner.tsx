'use client';

import { useState } from 'react';
import { Button, Card, CardContent, MonoLabel, Textarea, cn } from '@levelup/ui';
import { runLabTurn, submitLabAttempt } from '@/lib/api/labs';
import type {
  LabAttemptResponse,
  LabCriterionResult,
  LabDetail,
  LabTranscriptTurn,
} from '@/lib/api/labs';
import { ApiError } from '@/lib/api/errors';

interface LabRunnerProps {
  lab: LabDetail;
}

type Status = 'idle' | 'sending' | 'submitting';

export function LabRunner({ lab }: LabRunnerProps) {
  const [transcript, setTranscript] = useState<LabTranscriptTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabAttemptResponse | null>(null);

  const seededContextEntries = Object.entries(lab.seededContext ?? {});

  async function handleSend() {
    if (status !== 'idle') return;
    const userInput = draft.trim();
    if (!userInput) return;
    setError(null);
    setStatus('sending');

    try {
      const res = await runLabTurn(lab.slug, { transcript, userInput });
      const next: LabTranscriptTurn[] = [
        ...transcript,
        { role: 'user', content: userInput, ts: Date.now() },
        { role: 'assistant', content: res.assistantReply, ts: Date.now() },
      ];
      setTranscript(next);
      setDraft('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reach the lab assistant.');
    } finally {
      setStatus('idle');
    }
  }

  async function handleSubmit() {
    if (status !== 'idle') return;
    if (transcript.length === 0) {
      setError('Send at least one message before submitting.');
      return;
    }
    setError(null);
    setStatus('submitting');

    try {
      const res = await submitLabAttempt(lab.slug, { transcript });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit attempt.');
    } finally {
      setStatus('idle');
    }
  }

  function handleRetry() {
    setTranscript([]);
    setDraft('');
    setResult(null);
    setError(null);
  }

  if (result) {
    return <LabResult result={result} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-4">
      {seededContextEntries.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <MonoLabel>SCENARIO BRIEF</MonoLabel>
            <dl className="space-y-2 text-body-sm text-paper-200">
              {seededContextEntries.map(([key, value]) => (
                <div key={key} className="space-y-0.5">
                  <dt className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    {key}
                  </dt>
                  <dd className="whitespace-pre-wrap text-paper-200">
                    {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <MonoLabel tone="signal">CHAT TRANSCRIPT</MonoLabel>
            <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              {transcript.length} TURNS
            </span>
          </div>

          {transcript.length === 0 ? (
            <p className="text-body-sm text-paper-500">
              Send your first message below to begin the lab.
            </p>
          ) : (
            <div className="space-y-3">
              {transcript.map((t, i) => (
                <ChatBubble key={i} role={t.role} content={t.content} />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your message to the lab assistant…"
              rows={3}
              disabled={status !== 'idle'}
            />
            {error && (
              <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-rose-400">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleSend}
                disabled={status !== 'idle' || draft.trim().length === 0}
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleSubmit}
                disabled={status !== 'idle' || transcript.length === 0}
              >
                {status === 'submitting' ? 'Grading…' : 'Submit attempt'}
              </Button>
              <Button variant="ghost" onClick={handleRetry} disabled={status !== 'idle'}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-md border p-3 text-body-sm whitespace-pre-wrap',
          isUser
            ? 'border-signal/40 bg-signal/10 text-paper-100'
            : 'border-ink-700 bg-ink-900 text-paper-200',
        )}
      >
        <p className="mb-1 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          {isUser ? 'YOU' : 'ASSISTANT'}
        </p>
        {content}
      </div>
    </div>
  );
}

function LabResult({ result, onRetry }: { result: LabAttemptResponse; onRetry: () => void }) {
  const pct = Math.round(result.score * 100);
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <MonoLabel tone={result.passed ? 'signal' : undefined}>
            {result.passed ? 'PASSED' : 'NOT YET'}
          </MonoLabel>
          <p className="font-serif text-h1 italic text-paper-100">
            {pct}% — {result.passed ? 'Nice work.' : 'Keep practicing.'}
          </p>
          {result.passed && result.xpAwarded > 0 && (
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
              +{result.xpAwarded} XP AWARDED
            </p>
          )}
          {result.passed && result.xpAwarded === 0 && (
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              XP already awarded for this lab.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <MonoLabel>CRITERIA</MonoLabel>
          <ul className="space-y-2">
            {result.criteria.map((c) => (
              <CriterionRow key={c.id} criterion={c} />
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onRetry}>Try again</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CriterionRow({ criterion }: { criterion: LabCriterionResult }) {
  return (
    <li
      className={cn(
        'rounded-md border p-3',
        criterion.pass ? 'border-signal/40 bg-signal/5' : 'border-rose-500/40 bg-rose-500/5',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-200">
          {criterion.id}
        </p>
        <span
          className={cn(
            'font-mono text-mono-sm uppercase tracking-[0.05em]',
            criterion.pass ? 'text-signal' : 'text-rose-300',
          )}
        >
          {criterion.pass ? 'PASS' : 'FAIL'} · {Math.round(criterion.score * 100)}%
        </span>
      </div>
      {criterion.note && <p className="mt-2 text-body-sm text-paper-300">{criterion.note}</p>}
    </li>
  );
}
