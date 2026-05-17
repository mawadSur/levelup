/**
 * Content moderation for the Daily AI Briefing on /learn.
 *
 * The briefing is served to corporate L&D customers (e.g. Kapitus, CEO Lawyer).
 * The upstream feed (Hacker News Algolia search for "AI") regularly returns:
 *
 *   - stale items (HN ranks by points, so multi-year-old posts surface)
 *   - non-AI items (the word "AI" matches incidentally — "Airfoil", etc.)
 *   - politically charged or off-tone items inappropriate for a training surface
 *
 * This module provides three pure predicates and a single composed filter so
 * the same rules apply at every layer (fetch + UI defensive render).
 *
 * All matchers are case-insensitive. Patterns are intentionally broad — false
 * negatives (a bad item slips through) are worse than false positives (a
 * borderline AI item is dropped). A 14-day recency window is the third gate.
 */
import type { NewsItem } from './fetch-news';

/** Drop anything older than this many days. */
export const BRIEFING_MAX_AGE_DAYS = 14;

/**
 * Title or summary must contain at least one AI-related keyword for the item
 * to be considered on-topic. Word-boundary anchored to avoid matching e.g.
 * "Mai" containing "ai".
 */
export const AI_ALLOW_REGEX =
  /\b(ai|llm|llms|gpt|chatgpt|claude|gemini|anthropic|openai|copilot|cursor|agent|agents|agentic|rag|fine[\s-]?tun\w*|prompt|prompts|embedding|embeddings|transformer|transformers|inference|hallucinat\w*|model|models|neural|machine\s+learning|ml|deep\s+learning|generative|prompt\s+engineering|tokens?)\b/i;

/**
 * Deny-list of topics inappropriate for a corporate L&D briefing — political,
 * violent, sexually explicit, or mental-health crisis content. Matched against
 * title + summary even if the item also mentions AI.
 */
export const BRIEFING_DENY_REGEX =
  /\b(war|gaza|israel|palestin\w*|ukraine|russia|trump|biden|harris|election|elections|electoral|abortion|covid|vaccin\w*|protest|protests|riot|police|shooting|massacre|killed|murder|assault|terrorist|nazi|fascis\w*|racist|racism|sexis\w*|sexual\s+assault|rape|porn|nsfw|crypto[\s-]?scam|ponzi|psychosis|psychotic|mental\s+illness|suicid\w*|depress\w*|hit\s+piece)\b/i;

/** True if the item is within the recency window. */
export function isRecentEnough(
  item: Pick<NewsItem, 'publishedAt'>,
  now: number = Date.now(),
  maxAgeDays: number = BRIEFING_MAX_AGE_DAYS,
): boolean {
  const t = new Date(item.publishedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= now - maxAgeDays * 24 * 60 * 60 * 1000;
}

/** True if the item title/summary mentions an AI keyword. */
export function isOnTopic(item: Pick<NewsItem, 'title'> & { summary?: string | null }): boolean {
  const haystack = `${item.title ?? ''} ${item.summary ?? ''}`;
  return AI_ALLOW_REGEX.test(haystack);
}

/** True if the item is NOT on the deny-list (i.e. safe to show). */
export function passesDenyList(
  item: Pick<NewsItem, 'title'> & { summary?: string | null },
): boolean {
  const haystack = `${item.title ?? ''} ${item.summary ?? ''}`;
  return !BRIEFING_DENY_REGEX.test(haystack);
}

/**
 * Composed predicate: an item is allowed iff it is recent, on-topic, AND not
 * on the deny-list. Use this at every layer that emits briefing items.
 */
export function isAllowedBriefingItem(
  item: Pick<NewsItem, 'title' | 'publishedAt'> & { summary?: string | null },
  now: number = Date.now(),
): boolean {
  return isRecentEnough(item, now) && isOnTopic(item) && passesDenyList(item);
}

/** Filter a list of items through the composed predicate. */
export function filterBriefingItems<T extends Pick<NewsItem, 'title' | 'publishedAt'>>(
  items: T[],
  now: number = Date.now(),
): T[] {
  return items.filter((item) => isAllowedBriefingItem(item, now));
}
