/**
 * embed-content job handler.
 *
 * Loads the Lesson, chunks its text, embeds via @levelup/llm, mean-pools the
 * chunk embeddings, and upserts the result into LessonEmbedding via raw SQL.
 *
 * Returns: { embedded: true }
 */

import type { Job } from 'bullmq';
import type { EmbedContentInput, EmbedContentOutput } from '@levelup/queue';
import { logger } from '../logger.js';
import { embedLesson } from '../embedding/lesson-embedder.js';

export async function handleEmbedContent(job: Job<EmbedContentInput>): Promise<EmbedContentOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const { lessonId } = job.data;

  log.info('embed-content: starting', { lessonId });
  const start = Date.now();

  await embedLesson(lessonId, log);

  const durationMs = Date.now() - start;
  log.info('embed-content: completed', { lessonId, durationMs });

  return { embedded: true };
}
