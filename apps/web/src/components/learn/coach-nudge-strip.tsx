'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Badge, Button } from '@levelup/ui';
import { nudges } from '@/lib/api';
import type { CoachNudge } from '@/lib/api/nudges';

/**
 * Proactive coach nudge strip — surfaces up to 3 active nudges on /learn.
 *
 * Renders nothing when the API returns an empty list (or fails) so the
 * surrounding page layout stays clean.
 *
 * Wire contract:
 *  - "Try it"  → POST /api/nudges/:id/acted-on, navigate to
 *                /coach?prompt=<urlencoded suggestedTemplate>.
 *  - "Dismiss" → POST /api/nudges/:id/dismiss, remove row from list.
 *
 * Both actions update state optimistically and roll back on error so the
 * card never appears stuck mid-action.
 */
export function CoachNudgeStrip({ initial }: { initial?: CoachNudge[] }) {
  const router = useRouter();
  const [items, setItems] = useState<CoachNudge[]>(initial ?? []);
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initial !== undefined) return;
    const controller = new AbortController();
    nudges
      .listMyActive({ signal: controller.signal })
      .then((rows) => setItems(rows))
      .catch(() => {
        // Silent: this surface is additive.
      });
    return () => controller.abort();
  }, [initial]);

  const handleDismiss = useCallback(async (id: string) => {
    setPending((prev) => new Set(prev).add(id));
    const snapshot = items;
    setItems((rows) => rows.filter((r) => r.id !== id));
    try {
      await nudges.dismissNudge(id);
    } catch {
      // Rollback on failure so the user can retry.
      setItems(snapshot);
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    // setItems / snapshot are captured per-call; eslint deps would force a
    // dep on items which would re-create the handler every render and break
    // the snapshot capture pattern. The cb is shaped so this is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTryIt = useCallback(
    async (nudge: CoachNudge) => {
      setPending((prev) => new Set(prev).add(nudge.id));
      try {
        await nudges.markNudgeActedOn(nudge.id);
      } catch {
        // Even if the audit/state write fails, we still navigate — the user
        // expressed intent and a flaky telemetry write must not block them.
      }
      const params = new URLSearchParams();
      if (nudge.suggestedTemplate) params.set('prompt', nudge.suggestedTemplate);
      params.set('nudgeId', nudge.id);
      router.push(`/coach?${params.toString()}`);
    },
    [router],
  );

  if (items.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="coach-nudge-strip">
      {items.map((nudge) => (
        <Card key={nudge.id} data-testid={`coach-nudge-${nudge.kind}`}>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="signal">{labelForKind(nudge.kind)}</Badge>
                {nudge.actedOnAt && <Badge variant="default">TRIED</Badge>}
              </div>
              <p className="max-w-reading text-body text-paper-200">{nudge.body}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTryIt(nudge)}
                disabled={pending.has(nudge.id)}
                data-testid={`coach-nudge-try-${nudge.id}`}
              >
                Try it
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(nudge.id)}
                disabled={pending.has(nudge.id)}
                data-testid={`coach-nudge-dismiss-${nudge.id}`}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function labelForKind(kind: CoachNudge['kind']): string {
  switch (kind) {
    case 'REPEATED_SENSITIVE_PASTE':
      return 'PRIVACY TIP';
    case 'PROMPT_PATTERN_STUCK':
      return 'PROMPT TIP';
    case 'UNTOUCHED_SKILL_AFTER_LESSON':
      return 'TRY THE LAB';
    case 'STREAK_AT_RISK':
      return 'STREAK';
    default:
      return 'SUGGESTION';
  }
}
