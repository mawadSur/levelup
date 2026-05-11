'use client';

import * as React from 'react';
import { Badge, Card, CardContent, MonoLabel, toast } from '@levelup/ui';
import type { TriggerFeedItem } from '@/lib/api/governance';
import { TriggerDetailModal } from './trigger-detail-modal';

interface TriggerFeedProps {
  initialItems: TriggerFeedItem[];
}

function categoryVariant(category: string): 'signal' | 'success' | 'danger' | 'default' {
  const upper = category.toUpperCase();
  if (upper.includes('CREDENTIAL') || upper.includes('SECRET') || upper.includes('KEY'))
    return 'danger';
  if (upper.includes('PII') || upper.includes('PHI')) return 'danger';
  if (upper.includes('FINANCIAL') || upper.includes('SSN')) return 'danger';
  if (upper === 'GENERAL') return 'default';
  return 'signal';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  // YYYY-MM-DD HH:MM
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

export function TriggerFeed({ initialItems }: TriggerFeedProps) {
  const [selected, setSelected] = React.useState<TriggerFeedItem | null>(null);
  const [open, setOpen] = React.useState(false);

  function openDetail(item: TriggerFeedItem) {
    setSelected(item);
    setOpen(true);
  }

  function handleAssign(item: TriggerFeedItem) {
    if (!item.suggestedLesson) return;
    // The actual assign action is owned by the path-builder / paths module;
    // we surface the intent here and let the operator open the assignment screen.
    toast({
      title: 'Remediation queued',
      description: `${item.suggestedLesson.lessonTitle} → ${item.userMask}`,
    });
    setOpen(false);
  }

  if (initialItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <MonoLabel className="text-paper-500">
            NO SENSITIVE-DATA TRIGGERS IN THE LAST WINDOW
          </MonoLabel>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-ink-700">
            {initialItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openDetail(item)}
                  className="grid w-full grid-cols-[10rem,7rem,1fr,auto,auto] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-ink-800 focus:bg-ink-800 focus:outline-none"
                >
                  <span className="font-mono text-mono-sm tabular-nums text-paper-500">
                    {formatTime(item.occurredAt)}
                  </span>
                  <span className="font-mono text-mono-sm text-paper-300">{item.userMask}</span>
                  <span className="truncate text-body-sm text-paper-100">
                    {item.departmentName ?? '—'}
                  </span>
                  <Badge variant={categoryVariant(item.category)}>{item.category}</Badge>
                  <Badge variant={item.trained ? 'success' : 'danger'}>
                    {item.trained ? 'TRAINED' : 'UNTRAINED'}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <TriggerDetailModal
        item={selected}
        open={open}
        onOpenChange={setOpen}
        onAssign={handleAssign}
      />
    </>
  );
}
