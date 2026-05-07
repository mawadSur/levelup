/**
 * Dead-letter queue listener.
 *
 * Attaches a `failed` handler to a BullMQ Worker. When a job has exhausted its
 * retry budget (`attemptsMade >= attempts`) we persist a `DeadLetterJob` row
 * with the failure context. Earlier failures (still retrying) are ignored —
 * BullMQ will re-emit `failed` on the final attempt.
 *
 * The DLQ row captures enough to reconstruct the failure: job name, BullMQ id,
 * attempt count, error message, and the original payload as JSON. We do NOT
 * stash the stack trace — production logs already contain it via the worker
 * logger, and stacks tend to leak file paths and secrets into the database.
 *
 * TODO: add a /admin/dlq endpoint so SREs can browse/requeue rows in-product.
 * For now, query the table directly.
 */

import type { Worker, Job } from 'bullmq';
import type { Prisma } from '@levelup/db';
import { prisma } from '@levelup/db';
import { logger } from '../logger.js';

/**
 * Wire the DLQ listener onto an existing worker. Returns the worker for
 * chaining convenience.
 */
export function attachDlqListener<W extends Worker>(worker: W): W {
  worker.on('failed', async (job: Job | undefined, err: Error) => {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      // Still has retries left — BullMQ will emit `failed` again on the final
      // attempt. Do nothing now so we don't double-count.
      return;
    }

    try {
      await prisma.deadLetterJob.create({
        data: {
          jobName: job.name,
          jobId: job.id ?? 'unknown',
          attempts: job.attemptsMade,
          failedReason: err.message,
          // BullMQ types `data` as the job's input type; treat as JSON for
          // storage. `Prisma.InputJsonValue` is the right cast for arbitrary
          // structured input.
          data: (job.data ?? {}) as Prisma.InputJsonValue,
        },
      });

      logger.warn('dlq: job moved to dead-letter table', {
        jobName: job.name,
        jobId: job.id ?? 'unknown',
        attempts: job.attemptsMade,
        error: err.message,
      });
    } catch (writeErr) {
      // If the DLQ insert itself fails we still want a structured log line —
      // dropping the failure silently would defeat the whole point.
      const message = writeErr instanceof Error ? writeErr.message : String(writeErr);
      logger.error('dlq: failed to record dead-letter row', {
        jobName: job.name,
        jobId: job.id ?? 'unknown',
        originalError: err.message,
        dlqError: message,
      });
    }
  });

  return worker;
}
