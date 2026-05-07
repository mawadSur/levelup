'use client';

// ---------------------------------------------------------------------------
// Back-compat shim. The "session" concept has been replaced by
// "conversation" — this file used to render the sidebar directly. Callers
// should switch to importing `ConversationList` from
// `./conversation-list`. We keep this thin wrapper so any external import
// (or transient build state) keeps compiling while consumers migrate.
// ---------------------------------------------------------------------------

import type { CoachSession, ConversationSummary } from '@/lib/api/coach';
import { ConversationList } from './conversation-list';

interface RecentSessionsSidebarProps {
  sessions: CoachSession[];
  activeSessionId?: string;
  onNewConversation?: () => void;
}

/** @deprecated use `<ConversationList>` from `./conversation-list`. */
export function RecentSessionsSidebar({
  sessions,
  activeSessionId,
  onNewConversation,
}: RecentSessionsSidebarProps) {
  // Adapt the legacy CoachSession shape to ConversationSummary on the fly.
  // Older callers provide `messageCount` (legacy) — newer ones go through
  // ConversationList directly with `turnCount`.
  const conversations: ConversationSummary[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    lastTurnPreview: s.title ?? '',
    turnCount: s.messageCount,
    updatedAt: s.updatedAt,
  }));

  return (
    <ConversationList
      conversations={conversations}
      {...(activeSessionId !== undefined ? { activeConversationId: activeSessionId } : {})}
      {...(onNewConversation !== undefined ? { onNewConversation } : {})}
    />
  );
}
