'use client';

import * as React from 'react';
import { Button, MonoLabel } from '@levelup/ui';
import { Mail } from 'lucide-react';
import type { StuckLearner } from '@/lib/api/labs';

export interface StuckLearnerRow extends StuckLearner {
  labSlug: string;
  labTitle: string;
}

interface StuckLearnersTableProps {
  rows: StuckLearnerRow[];
}

export function StuckLearnersTable({ rows }: StuckLearnersTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-600 p-8 text-center">
        <MonoLabel className="block">STUCK LEARNERS</MonoLabel>
        <p className="mt-2 text-body-sm text-paper-300">
          No stuck learners — your team is moving smoothly.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <MonoLabel>STUCK LEARNERS</MonoLabel>
        <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          {rows.length}
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-ink-600">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-ink-600 bg-ink-800">
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Learner
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Lab
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Attempts
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Latest
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Weak spots
              </th>
              <th className="px-4 py-2.5 text-right font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600">
            {rows.map((row) => (
              <tr
                key={`${row.userId}:${row.labSlug}`}
                className="bg-ink-900 transition-colors hover:bg-ink-800"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-paper-100">{row.name}</p>
                  <p className="text-body-sm text-paper-500">{row.email}</p>
                </td>
                <td className="px-4 py-3 text-paper-200">{row.labTitle}</td>
                <td className="px-4 py-3 font-mono text-mono-sm tabular-nums text-paper-300">
                  {row.attemptCount}
                </td>
                <td className="px-4 py-3 font-mono text-mono-sm tabular-nums text-paper-300">
                  {Math.round(row.latestScore * 100)}%
                </td>
                <td className="px-4 py-3">
                  {row.weakestCriteria.length === 0 ? (
                    <span className="text-paper-500">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {row.weakestCriteria.map((id) => (
                        <span
                          key={id}
                          className="rounded-sm bg-rose-500/10 px-1.5 py-0.5 font-mono text-mono-sm uppercase tracking-[0.05em] text-rose-300"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <a href={buildNudgeMailto(row)} className="gap-1" rel="noreferrer noopener">
                      <Mail className="h-3.5 w-3.5" />
                      Send a nudge
                    </a>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildNudgeMailto(row: StuckLearnerRow): string {
  const subject = `Quick nudge on "${row.labTitle}"`;
  const body =
    `Hi ${row.name.split(' ')[0] || row.name},\n\n` +
    `I noticed you've taken ${row.attemptCount} attempts on "${row.labTitle}" — happy to ` +
    `talk through it if helpful. Common stumbling blocks so far: ` +
    `${row.weakestCriteria.join(', ') || 'none flagged'}.\n\n` +
    `You've got this.`;
  return `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}
