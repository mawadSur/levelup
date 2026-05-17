/**
 * Daily AI news for the /learn home page.
 *
 * Source: Hacker News Algolia search API — public, no key, JSON response,
 * decent quality for AI/ML signal. We query stories tagged with "AI" and sort
 * by points/recency. Next.js fetch cache revalidates once an hour so the page
 * is fast and we don't hammer the upstream.
 *
 * Ingested items pass through `filterBriefingItems` (recency + AI allow-list +
 * topic deny-list) so politically charged / stale / off-topic stories never
 * reach the rendered briefing. See `./briefing-filter.ts` for the rules.
 *
 * Network failure or stub mode degrades gracefully: the function returns []
 * and the consuming UI renders nothing. No throws.
 */
import { filterBriefingItems } from './briefing-filter';

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  author: string | null;
  points: number | null;
  commentsUrl: string;
  publishedAt: string;
}

interface HnHit {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string | null;
  points: number | null;
  num_comments: number | null;
  created_at: string;
  _tags: string[];
}

// We fetch a larger window than we render (50 hits) so the moderation filter
// in briefing-filter.ts has room to drop stale/off-topic/denied items and
// still leave a healthy 8 to display. `search_by_date` biases toward recent
// stories — combined with the 14-day recency cutoff this keeps the briefing
// genuinely fresh instead of HN's all-time-points leaderboard.
const HN_ENDPOINT =
  'https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=50&numericFilters=points>=20';

const REVALIDATE_SECONDS = 60 * 60;

export async function fetchDailyNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(HN_ENDPOINT, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ['daily-news'] },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { hits?: HnHit[] };
    const hits = data.hits ?? [];

    const mapped = hits
      .filter((h) => h.title && h.title.trim().length > 0)
      .map<NewsItem>((h) => ({
        id: h.objectID,
        title: h.title as string,
        url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: hostnameOf(h.url) ?? 'Hacker News',
        author: h.author,
        points: h.points,
        commentsUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
        publishedAt: h.created_at,
      }));

    // Moderation: recency + AI allow-list + topic deny-list. See
    // ./briefing-filter.ts for the rules. The UI also re-applies this
    // belt-and-suspenders in case a cached payload predates a rule change.
    return filterBriefingItems(mapped).slice(0, 8);
  } catch {
    return [];
  }
}

function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
