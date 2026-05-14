'use client';

import * as React from 'react';
import { Badge, Card, CardContent, MonoLabel, cn } from '@levelup/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LabAttemptHistoryItem } from '@/lib/api/labs';
import { LabAttemptSparkline } from './lab-attempt-sparkline';

interface LabPastAttemptsCardProps {
  attempts: LabAttemptHistoryItem[];
}

export function LabPastAttemptsCard({ attempts }: LabPastAttemptsCardProps) {
  const [open, setOpen] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  if (attempts.length === 0) return null;

  const ordered = [...attempts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const ascForSpark = [...attempts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <Card data-testid="lab-past-attempts">
      <CardContent className="space-y-4 p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <div className="flex items-center gap-3">
            <MonoLabel>YOUR PAST ATTEMPTS</MonoLabel>
            <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              {ordered.length}
            </span>
            <LabAttemptSparkline attempts={ascForSpark} />
          </div>
          {open ? (
            <ChevronDown className="h-4 w-4 text-paper-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-paper-500" />
          )}
        </button>

        {open && (
          <ul className="space-y-2">
            {ordered.map((a, i) => {
              const isExpanded = !!expanded[a.id];
              const pct = Math.round(a.score * 100);
              const attemptNumber = ordered.length - i;
              const ts = new Date(a.createdAt);
              return (
                <li
                  key={a.id}
                  className={cn(
                    'rounded-md border p-3',
                    a.passed ? 'border-signal/30 bg-signal/5' : 'border-ink-700 bg-ink-900',
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => setExpanded((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                        ATTEMPT {attemptNumber}
                      </span>
                      <span className="font-mono text-mono-sm tabular-nums text-paper-200">
                        {pct}%
                      </span>
                      <Badge variant={a.passed ? 'signal' : 'default'}>
                        {a.passed ? 'PASSED' : 'NOT YET'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-mono-sm text-paper-500">
                        {ts.toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-paper-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-paper-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && a.criteria.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {a.criteria.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-3 text-body-sm"
                        >
                          <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                            {c.id}
                          </span>
                          <span
                            className={cn(
                              'font-mono text-mono-sm uppercase tracking-[0.05em]',
                              c.pass ? 'text-signal' : 'text-rose-300',
                            )}
                          >
                            {c.pass ? 'PASS' : 'FAIL'} · {Math.round(c.score * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
