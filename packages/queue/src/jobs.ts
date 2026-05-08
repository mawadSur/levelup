import type { JobsOptions } from 'bullmq';
import { defaultJobOptions } from './config.js';
import type { JobName } from './types.js';

/**
 * Per-job registry: the queue name each job type lives on, plus any
 * job-specific option overrides layered on top of `defaultJobOptions`.
 *
 * When you add a new job to `JobMap` you MUST add a matching entry here AND
 * a typed enqueue helper in `queues.ts`.
 */
export interface JobRegistration {
  /** BullMQ queue name (the Redis key prefix). */
  queue: string;
  /** Job-specific option overrides merged with `defaultJobOptions`. */
  defaultOpts?: JobsOptions;
}

export const JOBS: Record<JobName, JobRegistration> = {
  'cert-pdf': {
    queue: 'cert-pdf',
    defaultOpts: {
      ...defaultJobOptions,
      // PDF generation can be slower; give it a generous timeout and fewer
      // automatic retries than the default to avoid hammering a slow service.
      attempts: 3,
    },
  },

  'report-aggregate': {
    queue: 'report-aggregate',
    defaultOpts: {
      ...defaultJobOptions,
      // Reports are heavyweight; serialise them with a low concurrency on the
      // worker side (enforced in createWorker call-sites, not here).
      attempts: 3,
    },
  },

  'embed-content': {
    queue: 'embed-content',
    // Uses the global default opts (5 attempts).
    defaultOpts: defaultJobOptions,
  },

  'send-email': {
    queue: 'send-email',
    defaultOpts: {
      ...defaultJobOptions,
      // Email delivery: retry quickly — most transient errors resolve in < 2 s.
      backoff: { type: 'exponential', delay: 500 },
    },
  },

  'data-export': {
    queue: 'data-export',
    defaultOpts: {
      ...defaultJobOptions,
      // Data exports can be slow (large zip); give extra attempts and time.
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  },

  'audit-cleanup': {
    queue: 'audit-cleanup',
    defaultOpts: {
      ...defaultJobOptions,
      // Cleanup is best-effort housekeeping: a few aggressive retries with
      // exponential back-off and then we give up until the next scheduled run.
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
    },
  },

  'manager-digest-cron': {
    queue: 'manager-digest-cron',
    defaultOpts: { attempts: 2 },
  },

  'path-generation': {
    queue: 'path-generation',
    defaultOpts: {
      ...defaultJobOptions,
      // Single attempt — the LLM call costs real money and a transient failure
      // re-running the whole 6-lesson generation would burn ~10k completion
      // tokens for no reason. Operators can re-trigger from the admin UI.
      attempts: 1,
      removeOnComplete: { age: 60 * 60 * 24 * 7 }, // keep success rows for 7 days
      removeOnFail: false,
    },
  },

  'anomaly-scan': {
    queue: 'anomaly-scan',
    defaultOpts: {
      // Single attempt — this is a periodic scan. If it fails, the next
      // hourly run will catch up. Re-running could double-write alerts.
      attempts: 1,
    },
  },

  'governance-report': {
    queue: 'governance-report',
    defaultOpts: {
      ...defaultJobOptions,
      // PDF generation can fail transiently (Storage upload hiccup); two
      // attempts is enough — the operator can re-trigger from the dashboard.
      attempts: 2,
      removeOnComplete: { age: 60 * 60 * 24 * 30 }, // keep success rows 30 days
      removeOnFail: false,
    },
  },
} as const;
