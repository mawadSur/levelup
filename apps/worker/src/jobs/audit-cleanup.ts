/**
 * audit-cleanup job handler.
 *
 * Deletes AuditLog rows older than the configured retention window
 * (default: 13 months). Streams in fixed-size batches so we never hold a
 * row-level lock long enough to block writers, and we cap each run so a
 * pathologically backed-up table cannot pin the worker indefinitely.
 *
 * Returns: { deleted }
 */

import type { Job } from 'bullmq';
import type { AuditCleanupInput, AuditCleanupOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import { logger } from '../logger.js';

const BATCH_SIZE = 5000;
/** Hard ceiling so a single run cannot dominate the worker for hours. */
const MAX_BATCHES_PER_RUN = 200;
/** 13 months in milliseconds — default retention window. */
const DEFAULT_RETENTION_MS = 13 * 30 * 24 * 60 * 60 * 1000;

export async function handleAuditCleanup(job: Job<AuditCleanupInput>): Promise<AuditCleanupOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const olderThan = job.data.olderThan
    ? new Date(job.data.olderThan)
    : new Date(Date.now() - DEFAULT_RETENTION_MS);

  if (Number.isNaN(olderThan.getTime())) {
    throw new Error(`audit-cleanup: invalid olderThan input: ${job.data.olderThan}`);
  }

  log.info('audit-cleanup: starting', { olderThan: olderThan.toISOString() });
  const start = Date.now();

  let totalDeleted = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    // Pick a batch of ids first, then delete by id. This avoids a giant
    // table scan + lock under DELETE … LIMIT (Postgres has no LIMIT on DELETE
    // without a CTE), and keeps each transaction small.
    const candidates = await prisma.auditLog.findMany({
      where: { createdAt: { lt: olderThan } },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (candidates.length === 0) break;

    const ids = candidates.map((row) => row.id);
    const result = await prisma.auditLog.deleteMany({
      where: { id: { in: ids } },
    });
    totalDeleted += result.count;

    log.debug('audit-cleanup: batch deleted', {
      batch,
      deleted: result.count,
      totalDeleted,
    });

    if (candidates.length < BATCH_SIZE) break;
  }

  const durationMs = Date.now() - start;
  log.info('audit-cleanup: completed', {
    deleted: totalDeleted,
    olderThan: olderThan.toISOString(),
    durationMs,
  });

  return { deleted: totalDeleted };
}
