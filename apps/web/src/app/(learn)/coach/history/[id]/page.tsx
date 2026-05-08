import 'server-only';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowLeft, Sparkles, User } from 'lucide-react';
import { Card, CardContent } from '@levelup/ui';
import type { ConversationDetail } from '@/lib/api/coach';
import { DeleteSessionButton } from '@/components/coach/delete-session-button';

export const metadata: Metadata = {
  title: 'Conversation',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SESSION_COOKIE = 'LEVELUP_SESSION';

async function fetchConversation(id: string): Promise<ConversationDetail | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session?.value) return null;
  try {
    // Hit the canonical /coach/conversations route so we get the new
    // `turns[]` shape directly.
    const res = await fetch(`${API_URL}/api/coach/conversations/${encodeURIComponent(id)}`, {
      headers: { Cookie: `${SESSION_COOKIE}=${session.value}` },
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as ConversationDetail;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CoachHistoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const conversation = await fetchConversation(id);

  if (!conversation) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/coach/history"
            className="mb-2 inline-flex items-center gap-1 text-xs text-paper-300 hover:text-paper-100 hover:underline"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            All conversations
          </Link>
          <h1 className="truncate text-2xl font-bold tracking-tight text-paper-100">
            {conversation.title ?? 'Untitled conversation'}
          </h1>
          <p className="mt-1 text-xs text-paper-300">{formatDate(conversation.createdAt)}</p>
          <Link
            href={`/coach?c=${encodeURIComponent(conversation.id)}`}
            className="mt-2 inline-flex items-center gap-1 text-xs text-signal hover:underline"
          >
            Continue this conversation
          </Link>
        </div>
        <DeleteSessionButton sessionId={conversation.id} />
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          {conversation.turns.length === 0 ? (
            <p className="text-sm text-paper-300">This conversation has no messages.</p>
          ) : (
            conversation.turns.map((turn) => {
              const isUser = turn.role === 'USER';
              return (
                <article key={turn.id} className="flex items-start gap-3">
                  <span
                    className={
                      isUser
                        ? 'mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-signal/10 text-signal'
                        : 'mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300'
                    }
                    aria-hidden="true"
                  >
                    {isUser ? <User size={14} /> : <Sparkles size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-paper-300">
                      {isUser ? 'You' : 'Coach'}
                      <span className="ml-2 font-normal normal-case tracking-normal">
                        {formatDate(turn.createdAt)}
                      </span>
                    </p>
                    <div className="whitespace-pre-wrap rounded-lg border bg-ink-900 p-3 text-sm leading-relaxed text-paper-100">
                      {turn.content}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
