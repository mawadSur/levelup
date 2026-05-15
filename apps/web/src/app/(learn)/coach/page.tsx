import 'server-only';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LEVELUP_SESSION } from '@levelup/auth-client';
import { CoachChat } from '@/components/coach/coach-chat';
import { ConversationList } from '@/components/coach/conversation-list';
import type { ConversationDetail, ConversationSummary } from '@/lib/api/coach';

export const metadata: Metadata = {
  title: 'AI Coach',
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? '' : 'http://localhost:4000');
const SESSION_COOKIE = LEVELUP_SESSION;

interface ServerSessionUser {
  userId?: string;
  id?: string;
  organizationId: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  email: string;
  name?: string;
  departmentId?: string | null;
  departmentName?: string | null;
}

interface DepartmentLite {
  id: string;
  name: string;
}

/**
 * Cookie-bound server fetch for the auth-required coach endpoints. Mirrors
 * the pattern in `@/lib/auth-client` but inlined here so we don't touch
 * other directories.
 */
async function serverGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session?.value) return null;

  try {
    const res = await fetch(`${API_URL}/api${path}`, {
      headers: { Cookie: `${SESSION_COOKIE}=${session.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface CoachPageProps {
  // Next 15 typed `searchParams` as a Promise. Accept the wider shape so the
  // page works on both Next 14 (sync) and 15 (async) — we await defensively.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickConversationId(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === 'string' && first.length > 0) return first;
  }
  return undefined;
}

export default async function CoachPage({ searchParams }: CoachPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const conversationId = pickConversationId(resolvedParams.c);

  // Fetch in parallel; tolerate failures (preview / unauthenticated)
  // gracefully by falling back to empty data.
  const [conversationsRes, me, depts, conversation] = await Promise.all([
    serverGet<{
      items: ConversationSummary[];
      nextCursor: string | null;
    }>('/coach/conversations'),
    serverGet<ServerSessionUser>('/auth/me'),
    serverGet<DepartmentLite[]>('/departments'),
    conversationId
      ? serverGet<ConversationDetail>(`/coach/conversations/${encodeURIComponent(conversationId)}`)
      : Promise.resolve(null),
  ]);

  // Resolve department name from id when possible.
  let departmentName: string | null = me?.departmentName ?? null;
  if (!departmentName && me?.departmentId && depts) {
    const found = depts.find((d) => d.id === me.departmentId);
    if (found) departmentName = found.name;
  }

  const conversations = conversationsRes?.items ?? [];

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[20rem_1fr]">
      <div className="hidden lg:block">
        <ConversationList
          conversations={conversations}
          activeConversationId={conversationId ?? null}
        />
      </div>
      <div className="flex min-h-0 flex-col">
        <CoachChat
          user={{
            name: me?.name,
            role: me?.role ?? 'EMPLOYEE',
            department: departmentName,
          }}
          conversationId={conversationId ?? null}
          initialConversation={conversation ?? null}
        />
      </div>
    </div>
  );
}
