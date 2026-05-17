/**
 * Regression tests for the Daily AI Briefing moderation filter.
 *
 * The 8 items below are exactly what /learn rendered in prod when the issue
 * was filed (signed-in employee view). Every one of them must be dropped by
 * `filterBriefingItems`. We also assert at least one positive case so a
 * future overly-aggressive regex doesn't black-hole the feed.
 *
 * Run: pnpm --filter @levelup/web test briefing-filter
 */
import { describe, it, expect } from 'vitest';
import {
  isRecentEnough,
  isOnTopic,
  passesDenyList,
  isAllowedBriefingItem,
  filterBriefingItems,
  BRIEFING_MAX_AGE_DAYS,
} from '../briefing-filter';
import type { NewsItem } from '../fetch-news';

// Fixed clock so the recency cutoff is deterministic in CI.
const NOW = new Date('2026-05-15T12:00:00Z').getTime();
const day = 24 * 60 * 60 * 1000;

function daysAgo(n: number): string {
  return new Date(NOW - n * day).toISOString();
}

function mkItem(partial: Partial<NewsItem> & { title: string; publishedAt: string }): NewsItem {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    title: partial.title,
    url: partial.url ?? 'https://example.com',
    source: partial.source ?? 'example.com',
    author: partial.author ?? null,
    points: partial.points ?? null,
    commentsUrl: partial.commentsUrl ?? 'https://news.ycombinator.com/item?id=0',
    publishedAt: partial.publishedAt,
  };
}

/**
 * The exact 8 items from the prod /learn briefing on the day the lane-c
 * ticket was filed. Each entry tags which gate(s) should drop it so we can
 * cross-check coverage.
 */
const PROD_BAD_ITEMS: Array<{
  title: string;
  ageDays: number;
  drops: Array<'recency' | 'off-topic' | 'deny'>;
}> = [
  {
    // Mentions "AI-edited" so it passes the AI gate; only the recency gate
    // catches it (67 days old).
    title: "Don't post generated/AI-edited comments. HN is for conversation between humans",
    ageDays: 67,
    drops: ['recency'],
  },
  {
    // No AI keyword at all — off-topic.
    title: 'Airfoil',
    ageDays: 810,
    drops: ['recency', 'off-topic'],
  },
  {
    title: 'Open source AI is the path forward',
    ageDays: 663,
    drops: ['recency'],
  },
  {
    title: 'My AI skeptic friends are all nuts',
    ageDays: 349,
    drops: ['recency'],
  },
  {
    // Recent enough hypothetically, but matches deny ("hit piece").
    title: 'An AI agent published a hit piece on me',
    ageDays: 94,
    drops: ['recency', 'deny'],
  },
  {
    title: 'Gemini AI',
    ageDays: 893,
    drops: ['recency'],
  },
  {
    // No AI keyword AND matches multiple deny terms (gaza, killed, massacre).
    title: 'IDF killed Gaza aid workers at point blank range in 2025 massacre: Report',
    ageDays: 82,
    drops: ['recency', 'off-topic', 'deny'],
  },
  {
    // 2 days old (recent), mentions AI (passes allow), but matches deny
    // ("psychosis"). This is the case the deny-list exists for.
    title: 'I believe there are entire companies right now under AI psychosis',
    ageDays: 2,
    drops: ['deny'],
  },
];

describe('briefing-filter — drops all 8 prod-bad items', () => {
  for (const bad of PROD_BAD_ITEMS) {
    it(`drops: "${bad.title}" (${bad.drops.join(', ')})`, () => {
      const item = mkItem({ title: bad.title, publishedAt: daysAgo(bad.ageDays) });
      expect(isAllowedBriefingItem(item, NOW)).toBe(false);

      // Cross-check that each declared drop reason actually fires.
      if (bad.drops.includes('recency')) {
        expect(isRecentEnough(item, NOW)).toBe(false);
      }
      if (bad.drops.includes('off-topic')) {
        expect(isOnTopic(item)).toBe(false);
      }
      if (bad.drops.includes('deny')) {
        expect(passesDenyList(item)).toBe(false);
      }
    });
  }

  it('filterBriefingItems removes all 8 in one pass', () => {
    const items = PROD_BAD_ITEMS.map((b) =>
      mkItem({ title: b.title, publishedAt: daysAgo(b.ageDays) }),
    );
    expect(filterBriefingItems(items, NOW)).toEqual([]);
  });
});

describe('briefing-filter — preserves legitimate AI items', () => {
  it('keeps a recent on-topic AI item with no denied terms', () => {
    const good = mkItem({
      title: 'Anthropic ships Claude 4 with improved tool use',
      publishedAt: daysAgo(1),
    });
    expect(isAllowedBriefingItem(good, NOW)).toBe(true);
  });

  it('keeps a recent on-topic LLM benchmark item', () => {
    const good = mkItem({
      title: 'New LLM benchmark suite for code generation released',
      publishedAt: daysAgo(5),
    });
    expect(isAllowedBriefingItem(good, NOW)).toBe(true);
  });

  it('keeps an item that mentions GPT and inference', () => {
    const good = mkItem({
      title: 'Speeding up GPT inference with speculative decoding',
      publishedAt: daysAgo(7),
    });
    expect(isAllowedBriefingItem(good, NOW)).toBe(true);
  });

  it('mixed list: drops bad, keeps good', () => {
    const items = [
      mkItem({ title: 'Airfoil', publishedAt: daysAgo(2) }),
      mkItem({ title: 'Anthropic ships Claude 4', publishedAt: daysAgo(2) }),
      mkItem({ title: 'IDF Gaza massacre report', publishedAt: daysAgo(2) }),
      mkItem({ title: 'New embedding model from OpenAI', publishedAt: daysAgo(3) }),
    ];
    const out = filterBriefingItems(items, NOW);
    expect(out.map((i) => i.title)).toEqual([
      'Anthropic ships Claude 4',
      'New embedding model from OpenAI',
    ]);
  });
});

describe('briefing-filter — recency boundary', () => {
  it(`uses a ${BRIEFING_MAX_AGE_DAYS}-day window`, () => {
    expect(BRIEFING_MAX_AGE_DAYS).toBe(14);
  });

  it('drops items just past the cutoff', () => {
    const stale = mkItem({
      title: 'OpenAI ships new model',
      publishedAt: daysAgo(BRIEFING_MAX_AGE_DAYS + 1),
    });
    expect(isRecentEnough(stale, NOW)).toBe(false);
    expect(isAllowedBriefingItem(stale, NOW)).toBe(false);
  });

  it('keeps items right at the cutoff edge', () => {
    const edge = mkItem({
      title: 'OpenAI ships new model',
      publishedAt: daysAgo(BRIEFING_MAX_AGE_DAYS - 1),
    });
    expect(isRecentEnough(edge, NOW)).toBe(true);
    expect(isAllowedBriefingItem(edge, NOW)).toBe(true);
  });

  it('drops items with an unparseable date', () => {
    const broken = mkItem({
      title: 'Anthropic releases something',
      publishedAt: 'not a date',
    });
    expect(isRecentEnough(broken, NOW)).toBe(false);
    expect(isAllowedBriefingItem(broken, NOW)).toBe(false);
  });
});
