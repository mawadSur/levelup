import 'server-only';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button, Card, CardContent } from '@levelup/ui';
import type { ConversationSummary } from '@/lib/api/coach';

export const metadata: Metadata = {
  title: 'Coach history',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SESSION_COOKIE = 'LEVELUP_SESSION';

async function fetchConversations(): Promise<ConversationSummary[]> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session?.value) return [];
  try {
    // Hit the canonical /coach/conversations endpoint. The legacy
    // /coach/sessions alias also wraps listConversations now, but using the
    // canonical route here keeps the response shape unambiguous.
    const res = await fetch(`${API_URL}/api/coach/conversations`, {
      headers: { Cookie: `${SESSION_COOKIE}=${session.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      items?: ConversationSummary[];
    };
    return body.items ?? [];
  } catch {
    return [];
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

function snippet(s: string | null, n = 120): string {
  if (!s) return 'Untitled conversation';
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n)}...` : t;
}

function pickLabel(c: ConversationSummary): string {
  if (c.title && c.title.trim().length > 0) return snippet(c.title);
  if (c.lastTurnPreview && c.lastTurnPreview.trim().length > 0) {
    return snippet(c.lastTurnPreview);
  }
  return 'Untitled conversation';
}

export default async function CoachHistoryPage() {
  const conversations = await fetchConversations();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/coach"
            className="mb-2 inline-flex items-center gap-1 text-xs text-paper-300 hover:text-paper-100 hover:underline"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Back to coach
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-paper-100">Conversation history</h1>
          <p className="mt-1 text-sm text-paper-300">Your past sessions with the AI coach.</p>
        </div>
        <Button asChild>
          <Link href="/coach">New conversation</Link>
        </Button>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare size={28} aria-hidden="true" className="mx-auto mb-3 text-paper-300" />
            <h2 className="mb-1 text-base font-semibold">No conversations yet</h2>
            <p className="mx-auto mb-5 max-w-xs text-sm text-paper-300">
              Once you chat with the coach, your conversations will show up here.
            </p>
            <Button asChild>
              <Link href="/coach">Start a conversation</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/coach?c=${encodeURIComponent(c.id)}`}
                className="block rounded-lg border bg-ink-900 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/10"
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-xs text-paper-300">{formatDate(c.updatedAt)}</span>
                  <span className="text-xs text-paper-300">
                    {c.turnCount} turn{c.turnCount === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-paper-100">{pickLabel(c)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
