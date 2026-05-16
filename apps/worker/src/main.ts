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

// Sentry must initialise BEFORE OTel so its auto-instrumentation sees an
// unpatched Node core. In stub mode (no SENTRY_DSN, or PLACEHOLDER_) this is
// a no-op so dev / test boots are unaffected.
import { initSentry } from './observability/sentry.js';
initSentry();
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
import { handleGovernanceReport } from './jobs/governance-report.js';
import { handleTrialExpiryCheck } from './jobs/trial-expiry-check.js';
import { handleGenerateSceneAsset } from './scenario/generate-scene-asset.js';
import { handleGenerateLessonImage } from './lesson-image/generate-lesson-image.js';
import { aggregateUserSkillsHandler } from './skills/aggregate-user-skills.js';
import { handleGenerateCoachNudges } from './nudges/generate-coach-nudges.js';
import { computeIndustryBenchmarksHandler } from './benchmarks/compute.js';
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

/** Daily at 02:00 UTC — runs ahead of audit-cleanup so archived orgs roll out
 * before the same day's retention sweep. */
const TRIAL_EXPIRY_CHECK_CRON = '0 2 * * *';
/** Stable jobId so BullMQ deduplicates the repeatable on worker restart. */
const TRIAL_EXPIRY_CHECK_REPEAT_JOB_ID = 'repeat:trial-expiry-check:daily';

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

  // governance-report — concurrency 1: PDF generation is CPU-bound, and a
  // single CISO-facing operator request shouldn't be able to starve the
  // worker pool. If queue depth becomes a problem, raise this gradually.
  registerWorker(
    'governance-report',
    createWorker('governance-report', handleGovernanceReport, { concurrency: 1 }),
    1,
  );

  // trial-expiry-check — concurrency 1: a daily sweep that mutates
  // organizations should never run in parallel with itself.
  registerWorker(
    'trial-expiry-check',
    createWorker('trial-expiry-check', handleTrialExpiryCheck, { concurrency: 1 }),
    1,
  );

  // generate-scene-asset — concurrency 2: image generation is mostly I/O
  // bound on the model API. Two parallel calls keep the seed-time backfill
  // brisk without thundering the OpenAI image endpoint.
  registerWorker(
    'generate-scene-asset',
    createWorker('generate-scene-asset', handleGenerateSceneAsset, { concurrency: 2 }),
    2,
  );

  // generate-lesson-image — same shape as scene-asset (I/O bound on the
  // image model). Two parallel calls is plenty for seed-time backfill.
  registerWorker(
    'generate-lesson-image',
    createWorker('generate-lesson-image', handleGenerateLessonImage, { concurrency: 2 }),
    2,
  );

  // aggregate-user-skills — daily roll-up of UserSkill mastery from
  // XpEvent + LabAttempt + AiCoachSession. Concurrency 1: one global run.
  registerWorker(
    'aggregate-user-skills',
    createWorker('aggregate-user-skills', aggregateUserSkillsHandler, { concurrency: 1 }),
    1,
  );

  // generate-coach-nudges — daily personalised nudge generator.
  registerWorker(
    'generate-coach-nudges',
    createWorker('generate-coach-nudges', handleGenerateCoachNudges, { concurrency: 1 }),
    1,
  );

  // compute-industry-benchmarks — weekly cross-tenant quantile aggregator.
  registerWorker(
    'compute-industry-benchmarks',
    createWorker('compute-industry-benchmarks', computeIndustryBenchmarksHandler, {
      concurrency: 1,
    }),
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

// Trial-expiry sweep — daily at 02:00 UTC
void (async () => {
  try {
    const trialExpiryQueue = new Queue('trial-expiry-check', { connection: getConnection() });
    await trialExpiryQueue.add(
      'trial-expiry-check',
      { triggeredAt: new Date().toISOString() },
      {
        repeat: { pattern: TRIAL_EXPIRY_CHECK_CRON },
        jobId: TRIAL_EXPIRY_CHECK_REPEAT_JOB_ID,
      },
    );
    logger.info('trial-expiry-check: recurring schedule registered', {
      cron: TRIAL_EXPIRY_CHECK_CRON,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('trial-expiry-check: failed to register recurring schedule', {
      error: message,
    });
  }
})();

// aggregate-user-skills — daily at 04:00 UTC
void (async () => {
  try {
    const q = new Queue('aggregate-user-skills', { connection: getConnection() });
    await q.add(
      'aggregate-user-skills',
      { triggeredAt: new Date().toISOString() },
      { repeat: { pattern: '0 4 * * *' }, jobId: 'repeat:aggregate-user-skills:daily' },
    );
    logger.info('aggregate-user-skills: recurring schedule registered (daily 04:00 UTC)');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('aggregate-user-skills: failed to register recurring schedule', {
      error: message,
    });
  }
})();

// generate-coach-nudges — daily at 06:00 UTC
void (async () => {
  try {
    const q = new Queue('generate-coach-nudges', { connection: getConnection() });
    await q.add(
      'generate-coach-nudges',
      { triggeredAt: new Date().toISOString() },
      { repeat: { pattern: '0 6 * * *' }, jobId: 'repeat:generate-coach-nudges:daily' },
    );
    logger.info('generate-coach-nudges: recurring schedule registered (daily 06:00 UTC)');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('generate-coach-nudges: failed to register recurring schedule', {
      error: message,
    });
  }
})();

// compute-industry-benchmarks — weekly Mondays at 02:00 UTC
void (async () => {
  try {
    const q = new Queue('compute-industry-benchmarks', { connection: getConnection() });
    await q.add(
      'compute-industry-benchmarks',
      { triggeredAt: new Date().toISOString() },
      { repeat: { pattern: '0 2 * * 1' }, jobId: 'repeat:compute-industry-benchmarks:weekly' },
    );
    logger.info('compute-industry-benchmarks: recurring schedule registered (Mon 02:00 UTC)');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('compute-industry-benchmarks: failed to register recurring schedule', {
      error: message,
    });
  }
})();
