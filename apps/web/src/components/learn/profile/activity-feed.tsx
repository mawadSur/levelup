import { ssrGet } from '@/lib/api/server-fetch';
import { activityEventSchema, type ActivityEvent } from '@levelup/types';

/**
 * Server component that fetches a user's last 20 activity events from
 * `GET /users/:id/activity` and renders them as a vertical timeline.
 *
 * Renders graceful empty/error states so the surrounding page never
 * blows up when the endpoint 401s, 404s, or returns nothing yet.
 *
 * The API caps the response at 50 events; the limit query param is a
 * client-side slice (the endpoint currently ignores it but accepts it
 * for forward compatibility).
 */
export async function ActivityFeed({ userId, limit = 20 }: { userId: string; limit?: number }) {
  if (userId === '') {
    return <EmptyState message="No user selected. Sign in to see your recent activity." />;
  }

  let events: ActivityEvent[] = [];
  let loadFailed = false;
  try {
    const raw = await ssrGet<unknown>(
      `/users/${encodeURIComponent(userId)}/activity?limit=${limit}`,
    );
    const parsed = activityEventSchema.array().safeParse(raw);
    events = parsed.success ? parsed.data.slice(0, limit) : [];
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return <EmptyState message="Activity feed is unavailable right now. Try again in a minute." />;
  }

  if (events.length === 0) {
    return (
      <EmptyState message="No activity yet — complete a lesson or quiz to start your timeline." />
    );
  }

  return (
    <ol role="list" className="space-y-3" aria-label="Recent activity">
      {events.map((e) => (
        <li
          key={e.id}
          className="flex items-start gap-3 rounded-md border border-ink-600 bg-ink-800/40 p-3"
        >
          <ActivityIcon type={e.type} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm text-paper-100">{e.title}</p>
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              {formatRelative(e.occurredAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-600 p-6 text-center">
      <p className="text-sm text-paper-300">{message}</p>
    </div>
  );
}

function ActivityIcon({ type }: { type: ActivityEvent['type'] }) {
  const glyph =
    type === 'lesson_completed'
      ? '✓'
      : type === 'quiz_attempted'
        ? '?'
        : type === 'certificate_earned'
          ? '★'
          : '◆';
  const label =
    type === 'lesson_completed'
      ? 'Lesson completed'
      : type === 'quiz_attempted'
        ? 'Quiz attempted'
        : type === 'certificate_earned'
          ? 'Certificate earned'
          : 'Badge earned';
  return (
    <span
      aria-label={label}
      className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-ink-600 bg-ink-900 font-mono text-mono-sm text-signal"
    >
      {glyph}
    </span>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'JUST NOW';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}M AGO`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}H AGO`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}D AGO`;
  return new Date(iso)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    .toUpperCase();
}
