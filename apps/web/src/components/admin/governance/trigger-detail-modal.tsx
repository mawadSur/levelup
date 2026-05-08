'use client';

import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, MonoLabel } from '@levelup/ui';
import type { TriggerFeedItem } from '@/lib/api/governance';

interface TriggerDetailModalProps {
  item: TriggerFeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign?: (item: TriggerFeedItem) => void;
}

function categoryVariant(category: string): 'signal' | 'success' | 'danger' | 'default' {
  const upper = category.toUpperCase();
  if (upper.includes('CREDENTIAL') || upper.includes('SECRET') || upper.includes('KEY')) return 'danger';
  if (upper.includes('PII') || upper.includes('PHI')) return 'danger';
  if (upper.includes('FINANCIAL') || upper.includes('SSN')) return 'danger';
  if (upper === 'GENERAL') return 'default';
  return 'signal';
}

export function TriggerDetailModal({ item, open, onOpenChange, onAssign }: TriggerDetailModalProps) {
  if (!item) return null;

  const occurred = new Date(item.occurredAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-h3 italic text-paper-100">
            Sensitive-data trigger
          </DialogTitle>
        </DialogHeader>

        <dl className="mt-3 space-y-4 text-body-sm">
          <div className="grid grid-cols-[8rem,1fr] items-start gap-3">
            <MonoLabel className="text-paper-500">OCCURRED</MonoLabel>
            <dd className="font-mono text-mono-sm tabular-nums text-paper-100">
              {occurred.toISOString().replace('T', ' ').slice(0, 19)} UTC
            </dd>
          </div>
          <div className="grid grid-cols-[8rem,1fr] items-start gap-3">
            <MonoLabel className="text-paper-500">USER</MonoLabel>
            <dd className="font-mono text-mono-sm text-paper-100">{item.userMask}</dd>
          </div>
          <div className="grid grid-cols-[8rem,1fr] items-start gap-3">
            <MonoLabel className="text-paper-500">DEPARTMENT</MonoLabel>
            <dd className="text-paper-100">{item.departmentName ?? '—'}</dd>
          </div>
          <div className="grid grid-cols-[8rem,1fr] items-start gap-3">
            <MonoLabel className="text-paper-500">CATEGORY</MonoLabel>
            <dd>
              <Badge variant={categoryVariant(item.category)}>{item.category}</Badge>
            </dd>
          </div>
          <div className="grid grid-cols-[8rem,1fr] items-start gap-3">
            <MonoLabel className="text-paper-500">TRAINING</MonoLabel>
            <dd>
              <Badge variant={item.trained ? 'success' : 'danger'}>
                {item.trained ? 'COMPLETED' : 'NOT COMPLETED'}
              </Badge>
            </dd>
          </div>
          <div className="grid grid-cols-[8rem,1fr] items-start gap-3">
            <MonoLabel className="text-paper-500">PROMPT</MonoLabel>
            <dd className="rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 font-mono text-mono-sm text-paper-300">
              {item.promptPreview || '(empty)'}
            </dd>
          </div>
          {item.policySection && (
            <div className="grid grid-cols-[8rem,1fr] items-start gap-3">
              <MonoLabel className="text-paper-500">POLICY</MonoLabel>
              <dd className="text-paper-300">{item.policySection}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-ink-600 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {item.suggestedLesson && onAssign && (
            <Button variant="primary" onClick={() => onAssign(item)}>
              ASSIGN {item.suggestedLesson.lessonTitle.toUpperCase()} →
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
