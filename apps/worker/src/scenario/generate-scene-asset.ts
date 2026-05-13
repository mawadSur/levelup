/**
 * generate-scene-asset job handler.
 *
 * Pre-renders the artwork for one scene in a scenario lesson and writes a
 * LessonSceneAsset row keyed by (lessonId, sceneSlug). Idempotent on
 * `promptHash`: re-running with the same hash returns the cached blob URL
 * without re-calling the image model.
 *
 * Real mode: OpenAI gpt-image-1 → PNG bytes → Supabase public bucket.
 * Stub mode: deterministic SVG data URL written straight into the DB row.
 *            No image API call, no storage upload, no network.
 */

import type { Job } from 'bullmq';
import type { GenerateSceneAssetInput, GenerateSceneAssetOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import { isStubMode, llmConfig } from '@levelup/llm';
import { uploadSceneAsset } from '@levelup/storage';
import { logger } from '../logger.js';
import { buildStubSceneSvg } from './stub-svg.js';
import { renderSceneImage } from './image-gen.js';

export async function handleGenerateSceneAsset(
  job: Job<GenerateSceneAssetInput>,
): Promise<GenerateSceneAssetOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const { lessonId, sceneSlug, imagePrompt, characters, promptHash } = job.data;
  log.info('generate-scene-asset: starting', { lessonId, sceneSlug, promptHash });

  const existing = await prisma.lessonSceneAsset.findUnique({
    where: { promptHash },
  });
  if (existing) {
    log.info('generate-scene-asset: cache hit', {
      lessonId,
      sceneSlug,
      blobUrl: existing.blobUrl.slice(0, 64),
    });
    return { blobUrl: existing.blobUrl };
  }

  let blobUrl: string;
  if (isStubMode() || !llmConfig.apiKey) {
    // Stub mode never throws — return a deterministic title-card SVG so
    // dev workflows render something predictable.
    blobUrl = buildStubSceneSvg({ sceneSlug, characters });
    log.info('generate-scene-asset: stub SVG', { lessonId, sceneSlug });
  } else {
    try {
      const rendered = await renderSceneImage({ imagePrompt, characters }, llmConfig.apiKey);
      const upload = await uploadSceneAsset(
        lessonId,
        sceneSlug,
        rendered.bytes,
        rendered.contentType,
      );
      blobUrl = upload.publicUrl;
      log.info('generate-scene-asset: rendered + uploaded', {
        lessonId,
        sceneSlug,
        storagePath: upload.storagePath,
        modelUsed: rendered.modelUsed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('generate-scene-asset: real-mode generation failed — falling back to stub', {
        lessonId,
        sceneSlug,
        error: message,
      });
      blobUrl = buildStubSceneSvg({ sceneSlug, characters });
    }
  }

  await prisma.lessonSceneAsset.upsert({
    where: { lessonId_sceneSlug: { lessonId, sceneSlug } },
    update: { promptHash, blobUrl },
    create: { lessonId, sceneSlug, promptHash, blobUrl },
  });

  return { blobUrl };
}
