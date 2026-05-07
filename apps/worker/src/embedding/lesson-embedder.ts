/**
 * Lesson embedder.
 *
 * Chunks lesson text, generates embeddings via @levelup/llm, then upserts the
 * mean-pooled 1536-d vector into the `lesson_embeddings` table via raw SQL.
 *
 * Chunking strategy:
 *   - If the combined text (title + body) is ≤ 500 chars: single embedding.
 *   - Otherwise: split on paragraph breaks (\n\n), keeping each chunk ≤ 1000
 *     chars. Adjacent paragraphs that together stay under 1000 chars are merged
 *     to reduce the number of API calls.
 *
 * Mean pooling:
 *   All chunk embeddings are averaged dimension-by-dimension into a single
 *   1536-d vector. This is the standard "paragraph-level mean pooling" approach
 *   used by the OpenAI docs.
 *
 * Upsert:
 *   Uses prisma.$executeRawUnsafe with a parameterized query. The vector value
 *   is passed as a stringified array literal cast to vector(1536) because
 *   Prisma does not natively support pgvector types.
 */

import { embed, isStubMode } from '@levelup/llm';
import { prisma } from '@levelup/db';
import type { Logger } from '../logger.js';

const SHORT_THRESHOLD = 500;
const CHUNK_MAX = 1000;

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

/**
 * Split `text` into chunks of at most `maxLen` characters, preferring
 * paragraph breaks as split points.
 */
function chunkText(text: string, maxLen: number): string[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxLen) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      // If a single paragraph exceeds maxLen, hard-split it
      if (para.length > maxLen) {
        for (let i = 0; i < para.length; i += maxLen) {
          chunks.push(para.slice(i, i + maxLen));
        }
        current = '';
      } else {
        current = para;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

// ---------------------------------------------------------------------------
// Mean pooling
// ---------------------------------------------------------------------------

/**
 * Compute the element-wise mean of an array of vectors.
 * All vectors must have the same dimension. Returns a zero vector if the
 * input array is empty.
 */
function meanPool(vectors: number[][]): number[] {
  if (vectors.length === 0) return new Array(1536).fill(0) as number[];

  const dim = vectors[0]?.length ?? 1536;
  const sum: number[] = new Array(dim).fill(0) as number[];

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      sum[i] = (sum[i] ?? 0) + (vec[i] ?? 0);
    }
  }

  return sum.map((v) => v / vectors.length);
}

// ---------------------------------------------------------------------------
// Public function
// ---------------------------------------------------------------------------

/**
 * Embed the given lesson and upsert the result into `lesson_embeddings`.
 */
export async function embedLesson(lessonId: string, log: Logger): Promise<void> {
  // Load lesson
  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { id: true, title: true, body: true },
  });

  const fullText = `${lesson.title}\n\n${lesson.body}`;

  // Decide chunking
  const chunks = fullText.length <= SHORT_THRESHOLD ? [fullText] : chunkText(fullText, CHUNK_MAX);

  log.debug('embedding lesson', {
    lessonId,
    textLength: fullText.length,
    chunkCount: chunks.length,
    stubMode: isStubMode(),
  });

  // Generate embeddings
  const rawVectors = await embed(chunks);

  // Warn if we got zero vectors (stub mode)
  const isZero = rawVectors.every((v) => v.every((x) => x === 0));
  if (isZero) {
    log.debug('embedding vector is zero (stub mode — no real embedding generated)', {
      lessonId,
    });
  }

  // Mean-pool to a single 1536-d vector
  const pooled = meanPool(rawVectors);

  // Format for pgvector: "[1.0,2.0,...]"
  const vectorLiteral = `[${pooled.join(',')}]`;

  // Upsert via raw SQL (Prisma has no native pgvector support)
  await prisma.$executeRawUnsafe(
    `INSERT INTO lesson_embeddings (id, "lessonId", embedding)
     VALUES (gen_random_uuid()::text, $1, $2::vector(1536))
     ON CONFLICT ("lessonId")
     DO UPDATE SET
       embedding = EXCLUDED.embedding`,
    lessonId,
    vectorLiteral,
  );

  log.info('lesson embedding upserted', { lessonId, chunkCount: chunks.length, isZero });
}
