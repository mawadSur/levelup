/**
 * Worker process entry point — LevelUp AI Academy.
 *
 * Boots all BullMQ workers (cert-pdf, report-aggregate, embed-content,
 * send-email, data-export, manager-digest-cron, audit-cleanup) and registers
 * SIGTERM / SIGINT handlers for graceful shutdown.
 *
 * Each worker drains active jobs before closing. If a worker does not drain
 * within 30 seconds the process exits forcefully with code 1.
 *
 * Cross-cutting concerns wired here:
 *  - DLQ: every worker has a `failed` listener attached via `attachDlqListener`.
 *    Terminally failed jobs (attempts exhausted) are persisted as DeadLetterJob
 *    rows for SRE inspection.
 *  - Recurring crons: manager weekly digest (Mon 08:00 UTC) and daily audit
 *    cleanup (03:00 UTC). Stable jobIds make BullMQ deduplicate the repeat
 *    entries on restart so we never accumulate duplicate schedules.
 */

// Must be the first import so OTel patches Node core before any framework loads.
import './observability/start.js';
import { Queue, type Worker } from 'bullmq';
import { createWorker, getConnection } from '@levelup/queue';
import { logger } from './logger.js';
import { concurrency } from './config.js';
import { handleCertPdf } from './jobs/cert-pdf.js';
import { handleReportAggregate } from './jobs/report-aggregate.js';
import { handleEmbedContent } from './jobs/embed-content.js';
import { handleSendEmail } from './jobs/send-email.js';
import { dataExportHandler } from './jobs/data-export.js';
import { managerDigestHandler } from './jobs/manager-digest.js';
import { handleAuditCleanup } from './jobs/audit-cleanup.js';
import { pathGenerationHandler } from './jobs/path-generation.js';
import { anomalyScanHandler } from './jobs/anomaly-scan.js';
import { attachDlqListener } from './jobs/dlq.js';

const SHUTDOWN_TIMEOUT_MS = 30_000;

/** Hourly at :00 — anomaly scan runs every hour. */
const ANOMALY_SCAN_CRON = '0 * * * *';
/** Stable jobId so BullMQ deduplicates the repeatable on worker restart. */
const ANOMALY_SCAN_REPEAT_JOB_ID = 'anomaly-scan-hourly';

/** Daily at 03:00 UTC — quiet time across all timezones we operate in. */
const AUDIT_CLEANUP_CRON = '0 3 * * *';
/** Stable jobId so BullMQ deduplicates the repeatable on worker restart. */
const AUDIT_CLEANUP_REPEAT_JOB_ID = 'audit-cleanup-daily';

// ---------------------------------------------------------------------------
// Boot workers
// ---------------------------------------------------------------------------

// Typed as Pick so we only expose the `close()` method we actually need,
// avoiding the generic Worker<Data,Result,Name> mismatch across multiple
// different job types in a single array.
interface Closeable {
  close(): Promise<void>;
}

const workers: Closeable[] = [];

/**
 * Wire DLQ + tracking for any newly-created worker. Centralising this means we
 * cannot forget to attach the dead-letter listener when adding a new worker.
 */
function registerWorker<W extends Worker>(label: string, worker: W, c: number): void {
  attachDlqListener(worker);
  workers.push(worker);
  logger.info(`worker ready: ${label}`, { concurrency: c });
}

function boot(): void {
  registerWorker(
    'cert-pdf',
    createWorker('cert-pdf', handleCertPdf, { concurrency: concurrency.certPdf }),
    concurrency.certPdf,
  );

  registerWorker(
    'report-aggregate',
    createWorker('report-aggregate', handleReportAggregate, {
      concurrency: concurrency.reportAggregate,
    }),
    concurrency.reportAggregate,
  );

  registerWorker(
    'embed-content',
    createWorker('embed-content', handleEmbedContent, {
      concurrency: concurrency.embedContent,
    }),
    concurrency.embedContent,
  );

  registerWorker(
    'send-email',
    createWorker('send-email', handleSendEmail, { concurrency: concurrency.sendEmail }),
    concurrency.sendEmail,
  );

  registerWorker(
    'data-export',
    createWorker('data-export', dataExportHandler, { concurrency: concurrency.dataExport }),
    concurrency.dataExport,
  );

  registerWorker(
    'manager-digest-cron',
    createWorker('manager-digest-cron', managerDigestHandler, { concurrency: 1 }),
    1,
  );

  // audit-cleanup — concurrency 1 so we never run two cleanups in parallel.
  registerWorker(
    'audit-cleanup',
    createWorker('audit-cleanup', handleAuditCleanup, { concurrency: 1 }),
    1,
  );

  registerWorker(
    'path-generation',
    createWorker('path-generation', pathGenerationHandler, {
      concurrency: concurrency.pathGeneration,
    }),
    concurrency.pathGeneration,
  );

  // anomaly-scan — concurrency 1: scans must not overlap to avoid double alerts.
  registerWorker(
    'anomaly-scan',
    createWorker('anomaly-scan', anomalyScanHandler, { concurrency: 1 }),
    1,
  );
}

/**
 * Schedule the recurring audit cleanup. BullMQ deduplicates repeating jobs by
 * (name + repeat-pattern + jobId), so calling this on every boot is safe and
 * idempotent — Redis keeps a single "repeat key" entry regardless of how many
 * times we register it.
 */
async function scheduleAuditCleanup(): Promise<void> {
  try {
    const queue = new Queue('audit-cleanup', { connection: getConnection() });
    await queue.add(
      'audit-cleanup',
      {},
      {
        repeat: { pattern: AUDIT_CLEANUP_CRON },
        jobId: AUDIT_CLEANUP_REPEAT_JOB_ID,
      },
    );
    logger.info('audit-cleanup: recurring schedule registered', {
      cron: AUDIT_CLEANUP_CRON,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('audit-cleanup: failed to register recurring schedule', {
      error: message,
    });
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`received ${signal} — beginning graceful shutdown`);

  const closePromises = workers.map(async (worker, index) => {
    logger.info(`worker shutting down [${index}]`);
    try {
      await worker.close();
      logger.info(`worker closed [${index}]`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`worker close error [${index}]`, { error: message });
    }
  });

  const timeout = new Promise<void>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms`)),
      SHUTDOWN_TIMEOUT_MS,
    ),
  );

  try {
    await Promise.race([Promise.all(closePromises), timeout]);
    logger.info('all workers closed — exiting cleanly');
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('graceful shutdown failed — forcing exit', { error: message });
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Signal handlers
// ---------------------------------------------------------------------------

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', {
    error: err.message,
    stack: err.stack?.split('\n')[0] ?? '',
  });
  // Do NOT exit — let BullMQ retry the job. Log and continue.
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? (reason.stack?.split('\n')[0] ?? '') : '';
  logger.error('unhandledRejection', { error: message, stack });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

boot();

// Manager weekly digest — Mondays 8am UTC
// Register the recurring cron after workers are booted.
// Using a stable jobId prevents duplicate schedule entries on restart.
void (async () => {
  try {
    const digestQueue = new Queue('manager-digest-cron', { connection: getConnection() });
    await digestQueue.add(
      'weekly-digest',
      {},
      {
        repeat: { pattern: '0 8 * * 1' /* Mon 8am UTC */ },
        jobId: 'recurring-weekly-digest',
      },
    );
    logger.info('manager-digest-cron: recurring schedule registered (Mon 08:00 UTC)');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('manager-digest-cron: failed to register recurring schedule', { error: message });
  }
})();

void scheduleAuditCleanup();

// Anomaly scan — every hour at :00
void (async () => {
  try {
    const anomalyQueue = new Queue('anomaly-scan', { connection: getConnection() });
    await anomalyQueue.add(
      'anomaly-scan',
      { triggeredAt: new Date().toISOString() },
      {
        repeat: { pattern: ANOMALY_SCAN_CRON },
        jobId: ANOMALY_SCAN_REPEAT_JOB_ID,
      },
    );
    logger.info('anomaly-scan: recurring schedule registered', {
      cron: ANOMALY_SCAN_CRON,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('anomaly-scan: failed to register recurring schedule', {
      error: message,
    });
  }
})();
