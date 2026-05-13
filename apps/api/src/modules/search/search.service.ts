/**
 * SearchService — CR.22
 *
 * Implements semantic search over lessons (via pgvector cosine similarity) and
 * text-based search over prompts. Falls back to ILIKE-based text search when
 * stub mode (zero vectors) is detected.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { embed, isStubMode } from '@levelup/llm';
import { SearchHit } from '@levelup/types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
const SNIPPET_LENGTH = 160;

// ---------------------------------------------------------------------------
// Raw SQL result shape (from lesson_embeddings join)
// ---------------------------------------------------------------------------

interface LessonEmbeddingRow {
  lessonId: string;
  title: string;
  slug: string;
  body: string;
  pathSlug: string;
  pathTitle: string;
  score: number | string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampLimit(raw: number | undefined): number {
  if (!raw || isNaN(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, raw), MAX_LIMIT);
}

/**
 * Derive a short snippet from lesson body.
 * Prefers a window around the first occurrence of a query term.
 */
function deriveSnippet(body: string, query: string): string {
  const lower = body.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Find earliest term match
  let bestIdx = -1;
  for (const word of words) {
    const idx = lower.indexOf(word);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  const start = bestIdx > SNIPPET_LENGTH / 2 ? bestIdx - Math.floor(SNIPPET_LENGTH / 4) : 0;
  const raw = body.slice(start, start + SNIPPET_LENGTH).trim();
  return (start > 0 ? '…' : '') + raw + (start + SNIPPET_LENGTH < body.length ? '…' : '');
}

/**
 * Convert a JS number array to a Postgres vector literal string.
 * e.g. [0.1, 0.2] → '[0.1,0.2]'
 */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async searchLessons(opts: {
    query: string;
    organizationId: string;
    userId: string;
    limit?: number;
  }): Promise<{ hits: SearchHit[]; stub: boolean }> {
    const { query, organizationId, userId } = opts;
    const limit = clampLimit(opts.limit);

    if (!query || query.trim().length < 2) {
      return { hits: [], stub: false };
    }

    const stub = isStubMode();
    let lessonHits: SearchHit[];

    if (stub) {
      lessonHits = await this.textSearchLessons(query, organizationId, limit);
    } else {
      lessonHits = await this.vectorSearchLessons(query, organizationId, limit);
    }

    // Mix in prompt hits at lower priority (text-based only)
    const promptHits = await this.textSearchPrompts(
      query,
      organizationId,
      userId,
      Math.floor(limit / 2),
    );

    // Interleave: all lessons first, then prompts
    const combined = [...lessonHits, ...promptHits].slice(0, limit);

    return { hits: combined, stub };
  }

  // --------------------------------------------------------------------------
  // Vector-based lesson search (pgvector cosine similarity)
  // --------------------------------------------------------------------------

  private async vectorSearchLessons(
    query: string,
    organizationId: string,
    limit: number,
  ): Promise<SearchHit[]> {
    let embeddings: number[][];
    try {
      embeddings = await embed([query]);
    } catch (err) {
      this.logger.warn('SearchService: embed() failed, falling back to text search', {
        error: err instanceof Error ? err.message : String(err),
      });
      return this.textSearchLessons(query, organizationId, limit);
    }

    const vector = embeddings[0];
    if (!vector || vector.length === 0) {
      return this.textSearchLessons(query, organizationId, limit);
    }

    const vectorLiteral = toVectorLiteral(vector);

    const rows = await this.prisma.$queryRawUnsafe<LessonEmbeddingRow[]>(
      `SELECT
         le."lessonId",
         l.title,
         l.slug,
         l.body,
         lp.slug AS "pathSlug",
         lp.title AS "pathTitle",
         lp."organizationId",
         1 - (le.embedding <=> $1::vector) AS score
       FROM lesson_embeddings le
       JOIN lessons l ON l.id = le."lessonId"
       JOIN learning_paths lp ON lp.id = l."learningPathId"
       WHERE (lp."organizationId" = $2 OR lp."organizationId" IS NULL)
         AND lp."isPublished" = true
       ORDER BY le.embedding <=> $1::vector
       LIMIT $3`,
      vectorLiteral,
      organizationId,
      limit,
    );

    return rows.map((row) => ({
      type: 'lesson' as const,
      id: row.lessonId,
      title: row.title,
      slug: row.slug,
      snippet: deriveSnippet(row.body, query),
      pathSlug: row.pathSlug,
      pathTitle: row.pathTitle,
      score: typeof row.score === 'string' ? parseFloat(row.score) : (row.score ?? 0),
    }));
  }

  // --------------------------------------------------------------------------
  // ILIKE-based lesson search (stub-mode fallback)
  // --------------------------------------------------------------------------

  private async textSearchLessons(
    query: string,
    organizationId: string,
    limit: number,
  ): Promise<SearchHit[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
        ],
        learningPath: {
          isPublished: true,
          OR: [{ organizationId }, { organizationId: null }],
        },
      },
      include: {
        learningPath: { select: { slug: true, title: true } },
      },
      take: limit,
    });

    return lessons.map((lesson, idx) => {
      // Score heuristic: title match ranks higher than body match
      const titleMatch = lesson.title.toLowerCase().includes(query.toLowerCase());
      const score = titleMatch ? 1 - idx * 0.02 : 0.5 - idx * 0.02;

      return {
        type: 'lesson' as const,
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        snippet: deriveSnippet(lesson.body, query),
        pathSlug: lesson.learningPath.slug,
        pathTitle: lesson.learningPath.title,
        score: Math.max(0, score),
      };
    });
  }

  // --------------------------------------------------------------------------
  // Text-based prompt search (no embeddings on prompts yet)
  // --------------------------------------------------------------------------

  private async textSearchPrompts(
    query: string,
    organizationId: string,
    userId: string,
    limit: number,
  ): Promise<SearchHit[]> {
    if (limit <= 0) return [];

    const prompts = await this.prisma.prompt.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { promptText: { contains: query, mode: 'insensitive' } },
        ],
        AND: [
          {
            OR: [
              { userId },
              { organizationId, isShared: true },
              { organizationId: undefined, isShared: true },
            ],
          },
        ],
      },
      take: limit,
    });

    return prompts.map((prompt, idx) => {
      const titleMatch = prompt.title.toLowerCase().includes(query.toLowerCase());
      const score = titleMatch ? 0.6 - idx * 0.02 : 0.4 - idx * 0.02;

      return {
        type: 'prompt' as const,
        id: prompt.id,
        title: prompt.title,
        slug: undefined,
        snippet: deriveSnippet(prompt.promptText, query),
        score: Math.max(0, score),
      };
    });
  }
}
