/**
 * generate-lesson-image job handler.
 *
 * Pre-renders the artwork for one `[image]` directive inside a READ-kind
 * lesson body. Writes a LessonImageAsset row keyed by (lessonId, slot).
 * Idempotent on `promptHash` — re-running with the same hash returns the
 * cached blob URL without re-calling the image model.
 *
 * Real mode: OpenAI gpt-image-1 → PNG bytes → Supabase `lesson-images` bucket.
 * Stub mode: deterministic SVG data URL written straight into the DB row.
 */

import type { Job } from 'bullmq';
import type { GenerateLessonImageInput, GenerateLessonImageOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import { isStubMode, llmConfig } from '@levelup/llm';
import { uploadLessonImage } from '@levelup/storage';
import { logger } from '../logger.js';
import { renderSceneImage } from '../scenario/image-gen.js';
import { buildStubLessonImageSvg } from './stub-svg.js';

export async function handleGenerateLessonImage(
  job: Job<GenerateLessonImageInput>,
): Promise<GenerateLessonImageOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const { lessonId, slot, prompt, promptHash } = job.data;
  log.info('generate-lesson-image: starting', { lessonId, slot, promptHash });

  const existing = await prisma.lessonImageAsset.findUnique({
    where: { promptHash },
  });
  if (existing) {
    log.info('generate-lesson-image: cache hit', {
      lessonId,
      slot,
      blobUrl: existing.blobUrl.slice(0, 64),
    });
    return { blobUrl: existing.blobUrl };
  }

  let blobUrl: string;
  if (isStubMode() || !llmConfig.apiKey) {
    blobUrl = buildStubLessonImageSvg({ lessonId, slot, prompt });
    log.info('generate-lesson-image: stub SVG', { lessonId, slot });
  } else {
    try {
      const rendered = await renderSceneImage(
        { imagePrompt: prompt, characters: [] },
        llmConfig.apiKey,
      );
      const upload = await uploadLessonImage(lessonId, slot, rendered.bytes, rendered.contentType);
      blobUrl = upload.publicUrl;
      log.info('generate-lesson-image: rendered + uploaded', {
        lessonId,
        slot,
        storagePath: upload.storagePath,
        modelUsed: rendered.modelUsed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('generate-lesson-image: real-mode generation failed — falling back to stub', {
        lessonId,
        slot,
        error: message,
      });
      blobUrl = buildStubLessonImageSvg({ lessonId, slot, prompt });
    }
  }

  await prisma.lessonImageAsset.upsert({
    where: { lessonId_slot: { lessonId, slot } },
    update: { promptHash, blobUrl },
    create: { lessonId, slot, promptHash, blobUrl },
  });

  return { blobUrl };
}
