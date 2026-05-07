/**
 * path-generation job handler — CR.33 AI-generated learning paths.
 *
 * Pipeline:
 *   1. Mark request GENERATING.
 *   2. Load org name (for personalization in the LLM prompt).
 *   3. Call generateLearningPath() — returns the parsed, schema-validated path.
 *   4. Persist the parsed JSON into request.draft and flip status to READY.
 *   5. On any error: status FAILED, reason persisted. Do NOT re-throw — the
 *      queue is configured for a single attempt anyway, and re-throwing would
 *      blow up the BullMQ worker's logs without changing behaviour.
 *
 * The handler intentionally never auto-accepts the draft. The admin reviews
 * it from /admin/learning/build and clicks accept to materialize the real
 * LearningPath rows.
 */

import type { Job } from 'bullmq';
import type { PathGenerationInput, PathGenerationOutput } from '@levelup/queue';
import type { Prisma } from '@levelup/db';
import { prisma } from '@levelup/db';
import { generateLearningPath, type GeneratedPath } from '@levelup/llm';
import { logger } from '../logger.js';

export async function pathGenerationHandler(
  job: Job<PathGenerationInput>,
): Promise<PathGenerationOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const { requestId } = job.data;

  log.info('path-generation: starting', { requestId });
  const start = Date.now();

  // 1. Load the request and assert it is still actionable.
  const request = await prisma.pathGenerationRequest.findUnique({
    where: { id: requestId },
    include: { organization: { select: { name: true } } },
  });

  if (!request) {
    log.warn('path-generation: request not found', { requestId });
    return { status: 'FAILED' };
  }

  if (request.status === 'CANCELLED') {
    log.info('path-generation: skipping cancelled request', { requestId });
    return { status: 'FAILED' };
  }

  if (request.status === 'READY' && request.draft !== null) {
    log.info('path-generation: already completed', { requestId });
    return { status: 'READY' };
  }

  // 2. Mark GENERATING.
  await prisma.pathGenerationRequest.update({
    where: { id: requestId },
    data: { status: 'GENERATING' },
  });

  // 3. Call the LLM (or stub) and persist.
  let generated: GeneratedPath;
  try {
    generated = await generateLearningPath({
      prompt: request.prompt,
      ...(request.audience ? { audience: request.audience } : {}),
      organizationName: request.organization.name,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    log.error('path-generation: failed', { requestId, error: reason });

    await prisma.pathGenerationRequest
      .update({
        where: { id: requestId },
        data: {
          status: 'FAILED',
          failedReason: reason.slice(0, 2000),
          completedAt: new Date(),
        },
      })
      .catch((updateErr) => {
        const updateReason = updateErr instanceof Error ? updateErr.message : String(updateErr);
        log.error('path-generation: failed to persist FAILED status', {
          requestId,
          error: updateReason,
        });
      });

    // Do NOT throw — single-attempt queue, the FAILED row is the contract.
    return { status: 'FAILED' };
  }

  await prisma.pathGenerationRequest.update({
    where: { id: requestId },
    data: {
      status: 'READY',
      draft: generated as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
      failedReason: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: request.organizationId,
      actorId: request.requestedById,
      action: 'path_builder.generated',
      targetType: 'PathGenerationRequest',
      targetId: requestId,
      metadata: {
        lessonCount: generated.lessons.length,
        title: generated.title,
        durationMs: Date.now() - start,
      },
    },
  });

  const durationMs = Date.now() - start;
  log.info('path-generation: completed', { requestId, durationMs });

  return { status: 'READY' };
}
