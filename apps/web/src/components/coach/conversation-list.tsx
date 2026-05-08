'use client';

import Link from 'next/link';
import { History, MessageSquare, Plus } from 'lucide-react';
import { Button, MonoLabel, cn } from '@levelup/ui';
import type { ConversationSummary } from '@/lib/api/coach';

// ---------------------------------------------------------------------------
// Sidebar list of past coach conversations.
//
// Receives a pre-fetched list of conversations (the parent server component
// fetches via cookie-bound API) and renders them as `?c=<id>` links on the
// /coach page. The active conversation is highlighted.
// ---------------------------------------------------------------------------

interface ConversationListProps {
  conversations: ConversationSummary[];
  /** When provided, that conversation is highlighted in the sidebar. */
  activeConversationId?: string | null;
  /**
   * Optional override: when set the "+ New conversation" button calls this
   * instead of navigating. Useful when we want to clear in-memory state in
   * the chat surface without a hard reload.
   */
  onNewConversation?: () => void;
}

function relativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffMin = Math.round((now - then) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.round(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function snippet(s: string | null, n = 60): string {
  if (!s) return 'Untitled conversation';
  const trimmed = s.trim();
  return trimmed.length > n ? `${trimmed.slice(0, n)}...` : trimmed;
}

/**
 * Pick the best label for a conversation in the sidebar:
 *  - prefer the auto-generated `title` (set from the first user input)
 *  - fall back to the `lastTurnPreview` (first 60 chars of the most recent
 *    user message) when the title hasn't been set yet
 *  - finally fall back to the placeholder
 */
function pickLabel(c: ConversationSummary): string {
  if (c.title && c.title.trim().length > 0) return snippet(c.title, 60);
  if (c.lastTurnPreview && c.lastTurnPreview.trim().length > 0) {
    return snippet(c.lastTurnPreview, 60);
  }
  return 'Untitled conversation';
}

export function ConversationList({
  conversations,
  activeConversationId,
  onNewConversation,
}: ConversationListProps) {
  const recent = conversations.slice(0, 20);

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-ink-600 bg-ink-800">
      <div className="border-b border-ink-600 p-3">
        {onNewConversation ? (
          <Button className="w-full justify-start" variant="primary" onClick={onNewConversation}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New conversation
          </Button>
        ) : (
          <Button className="w-full justify-start" variant="primary" asChild>
            <Link href="/coach">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              New conversation
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between px-3 pb-2 pt-4">
        <MonoLabel>HISTORY</MonoLabel>
        <Link
          href="/coach/history"
          className="inline-flex items-center gap-1 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500 hover:text-paper-100"
        >
          <History size={12} aria-hidden="true" />
          ALL
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {recent.length === 0 ? (
          <p className="px-2 py-4 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            NO CONVERSATIONS YET
          </p>
        ) : (
          <ul className="space-y-0.5">
            {recent.map((c) => {
              const isActive = c.id === activeConversationId;
              const label = pickLabel(c);
              return (
                <li key={c.id}>
                  <Link
                    href={`/coach?c=${encodeURIComponent(c.id)}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-start gap-2.5 rounded-sm px-2 py-2 text-body-sm transition-colors',
                      isActive
                        ? 'bg-ink-700 text-paper-100'
                        : 'text-paper-300 hover:bg-ink-700 hover:text-paper-100',
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1 bottom-1 w-[2px] bg-signal"
                      />
                    )}
                    <MessageSquare
                      size={14}
                      aria-hidden="true"
                      className="mt-0.5 flex-none text-paper-500"
                    />
                    <span className="flex-1 overflow-hidden">
                      <span className="block truncate text-body-sm font-medium leading-snug">
                        {label}
                      </span>
                      <span className="mt-0.5 block font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                        {relativeTime(c.updatedAt).toUpperCase()}
                        {c.turnCount > 0 ? ` · ${c.turnCount} TURNS` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
