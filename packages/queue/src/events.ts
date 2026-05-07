import { QueueEvents } from 'bullmq';
import { getConnection } from './connection.js';
import { JOBS } from './jobs.js';
import type { JobName } from './types.js';

// ---------------------------------------------------------------------------
// Typed QueueEvents factory (singleton-per-job-name)
// ---------------------------------------------------------------------------

const _queueEvents = new Map<JobName, QueueEvents>();

/**
 * Return (or create) a `QueueEvents` listener for the given job name.
 *
 * `QueueEvents` uses a **dedicated** blocking Redis connection internally —
 * BullMQ creates its own connection from the options you supply, so we pass
 * `getConnection()` as the seed and BullMQ duplicates it as needed.
 *
 * Example usage:
 * ```ts
 * const events = getQueueEvents('cert-pdf');
 * events.on('completed', ({ jobId, returnvalue }) => { ... });
 * events.on('failed',    ({ jobId, failedReason }) => { ... });
 * ```
 */
export function getQueueEvents<K extends JobName>(name: K): QueueEvents {
  let qe = _queueEvents.get(name);
  if (!qe) {
    const reg = JOBS[name];
    qe = new QueueEvents(reg.queue, {
      connection: getConnection(),
    });
    _queueEvents.set(name, qe);
  }
  return qe;
}
