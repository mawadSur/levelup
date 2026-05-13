import { Card, CardContent } from '@levelup/ui';
import type { NewsItem } from '@/lib/news/fetch-news';

interface NewsStreamProps {
  items: NewsItem[];
}

/**
 * Daily AI briefing on /learn. Server-rendered list of curated stories.
 * Empty when the upstream feed is unreachable — the caller decides whether
 * to render the section at all.
 */
export function NewsStream({ items }: NewsStreamProps) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <NewsCard item={item} />
        </li>
      ))}
    </ul>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Card>
      <CardContent className="p-4">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-body font-medium text-paper-100 transition-colors group-hover:text-signal">
              {item.title}
            </p>
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="shrink-0 mt-1 text-paper-500 transition-colors group-hover:text-signal"
            >
              <path
                d="M3 11L11 3M11 3H5M11 3V9"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            <span>{item.source}</span>
            <span aria-hidden>·</span>
            <span>{timeAgo(item.publishedAt)}</span>
            {item.points != null && item.points > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>{item.points} pts</span>
              </>
            )}
          </div>
        </a>
      </CardContent>
    </Card>
  );
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))}m ago`;
  if (diff < day) return `${Math.round(diff / hour)}h ago`;
  return `${Math.round(diff / day)}d ago`;
}
