/**
 * @levelup/queue — public surface
 *
 * Re-exports everything callers need to produce jobs (enqueue helpers, getQueue)
 * or consume them (createWorker), plus the QueueEvents factory and shared types.
 */

// Connection
export { getConnection } from './connection.js';

// Rate limiter (Redis sliding-window helper)
export { checkRateLimit } from './rate-limit.js';
export type { RateLimitResult, CheckRateLimitOptions } from './rate-limit.js';

// Queue factory + per-job enqueue helpers
export {
  getQueue,
  enqueueCertPdf,
  enqueueReportAggregate,
  enqueueEmbedContent,
  enqueueEmail,
  enqueueDataExport,
  enqueueAuditCleanup,
  enqueueManagerDigestCron,
  enqueuePathGeneration,
  enqueueAnomalyScan,
} from './queues.js';

// Worker factory
export { createWorker } from './worker.js';

// QueueEvents factory
export { getQueueEvents } from './events.js';

// Job catalog (for introspection / tooling)
export { JOBS } from './jobs.js';

// Types
export type {
  JobMap,
  JobName,
  CertPdfInput,
  CertPdfOutput,
  ReportAggregateInput,
  ReportAggregateOutput,
  EmbedContentInput,
  EmbedContentOutput,
  SendEmailInput,
  SendEmailOutput,
  DataExportInput,
  DataExportOutput,
  AuditCleanupInput,
  AuditCleanupOutput,
  ManagerDigestCronInput,
  ManagerDigestCronOutput,
  PathGenerationInput,
  PathGenerationOutput,
  AnomalyScanInput,
  AnomalyScanOutput,
} from './types.js';
