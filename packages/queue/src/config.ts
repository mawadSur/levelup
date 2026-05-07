import type { JobsOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';

/**
 * Parse REDIS_URL into ioredis connection options.
 *
 * Supported schemes:
 *   redis://[:<password>@]<host>[:<port>][/<db>]
 *   rediss://...   → same but with TLS enabled
 *
 * No stub mode — Redis is required even in local dev (pnpm infra:up starts it).
 */
export function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);

  const tls = parsed.protocol === 'rediss:';
  const host = parsed.hostname || 'localhost';
  const port = parsed.port ? parseInt(parsed.port, 10) : 6379;
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
  // pathname is like "/0" for db 0
  const dbStr = parsed.pathname.replace(/^\//, '');
  const db = dbStr ? parseInt(dbStr, 10) : 0;

  const opts: RedisOptions = {
    host,
    port,
    db,
    // BullMQ requirement: must be null so the client does not time out
    // between job executions while blocked on BRPOPLPUSH / BLPOP.
    maxRetriesPerRequest: null,
    // Reconnect so the queue never silently drops jobs on transient failures.
    retryStrategy: (times: number) => Math.min(times * 200, 5000),
  };

  if (password) {
    opts.password = password;
  }

  if (tls) {
    opts.tls = {};
  }

  return opts;
}

/** Raw Redis URL used throughout the package. */
export const REDIS_URL: string = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

/** Parsed ioredis options derived from REDIS_URL. */
export const redisOptions: RedisOptions = parseRedisUrl(REDIS_URL);

/**
 * Default BullMQ job options applied to every enqueued job unless overridden.
 *
 * - 5 attempts with exponential back-off starting at 1 s.
 * - Keep the last 1 000 completed jobs and 5 000 failed jobs in Redis for
 *   observability without blowing up memory indefinitely.
 */
export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};
