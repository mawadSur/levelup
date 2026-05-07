import { Worker, type Job, type WorkerOptions } from 'bullmq';
import { getConnection } from './connection.js';
import { JOBS } from './jobs.js';
import type { JobMap, JobName } from './types.js';

// ---------------------------------------------------------------------------
// Minimal console-based logger
// The caller can redirect or replace these by wrapping createWorker.
// ---------------------------------------------------------------------------

const log = {
  info: (msg: string, ...meta: unknown[]) => console.info(`[queue] ${msg}`, ...meta),
  warn: (msg: string, ...meta: unknown[]) => console.warn(`[queue] ${msg}`, ...meta),
  error: (msg: string, ...meta: unknown[]) => console.error(`[queue] ${msg}`, ...meta),
};

// ---------------------------------------------------------------------------
// Typed worker factory
// ---------------------------------------------------------------------------

/**
 * Create a BullMQ `Worker` for a specific job type.
 *
 * The `handler` receives a `Job<Input>` that is fully typed — TypeScript
 * infers `Input` and `Output` from `JobMap[K]` so there is no implicit `any`.
 *
 * Lifecycle events (start / complete / failure) are logged automatically.
 * The caller is responsible for calling `worker.close()` on shutdown.
 *
 * @param name    - Job name from the catalog (keyof JobMap).
 * @param handler - Async function that processes the job and returns the output.
 * @param opts    - Additional BullMQ WorkerOptions (concurrency, limiter, …).
 */
export function createWorker<K extends JobName>(
  name: K,
  handler: (job: Job<JobMap[K]['input']>) => Promise<JobMap[K]['output']>,
  opts?: Omit<WorkerOptions, 'connection'>,
): Worker<JobMap[K]['input'], JobMap[K]['output']> {
  const reg = JOBS[name];

  const worker = new Worker<JobMap[K]['input'], JobMap[K]['output']>(
    reg.queue,
    async (job: Job<JobMap[K]['input']>) => {
      const start = Date.now();
      log.info(`job started  id=${job.id} name=${job.name}`);

      const result = await handler(job);

      const durationMs = Date.now() - start;
      log.info(`job completed id=${job.id} name=${job.name} duration=${durationMs}ms`);

      return result;
    },
    {
      ...opts,
      connection: getConnection(),
    },
  );

  worker.on('failed', (job: Job<JobMap[K]['input']> | undefined, err: Error) => {
    log.error(
      `job failed id=${job?.id ?? 'unknown'} name=${job?.name ?? name} ` +
        `attempts=${job?.attemptsMade ?? '?'} error=${err.message}`,
    );
  });

  worker.on('error', (err: Error) => {
    log.error(`worker error queue=${reg.queue} error=${err.message}`);
  });

  return worker;
}
