/**
 * Daily AI news for the /learn home page.
 *
 * Source: Hacker News Algolia search API — public, no key, JSON response,
 * decent quality for AI/ML signal. We query stories tagged with "AI" and sort
 * by points/recency. Next.js fetch cache revalidates once an hour so the page
 * is fast and we don't hammer the upstream.
 *
 * Network failure or stub mode degrades gracefully: the function returns []
 * and the consuming UI renders nothing. No throws.
 */

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

const HN_ENDPOINT =
  'https://hn.algolia.com/api/v1/search?query=AI&tags=story&hitsPerPage=12&numericFilters=points>=20';

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

    return hits
      .filter((h) => h.title && h.title.trim().length > 0)
      .slice(0, 8)
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
