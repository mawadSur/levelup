/**
 * Redis-backed sliding-window rate limiter.
 *
 * Uses INCR + PEXPIRE on a per-window key (`rl:<key>:<bucket>`). The bucket id
 * is `floor(now / windowMs)` so two adjacent requests in the same window share
 * a counter and the key auto-expires shortly after the window ends — no manual
 * cleanup required.
 *
 * Trade-offs:
 *  - Coarse fixed window. A burst at the boundary can briefly allow up to
 *    2 × limit requests; acceptable for the coach endpoint where the absolute
 *    cap is generous (30 req/min) and overshoot for one second is harmless.
 *  - On Redis failure the call **fails open** (allows the request) and logs
 *    the error once per process. Blocking legitimate users on a Redis hiccup
 *    would be a worse outcome than briefly under-counting.
 */
import { getConnection } from './connection.js';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface CheckRateLimitOptions {
  /** Caller-supplied key, e.g. `coach:user_123`. Already namespaced internally. */
  key: string;
  /** Allowed requests per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

let _redisDownLogged = false;

function logRedisDownOnce(err: unknown): void {
  if (_redisDownLogged) return;
  _redisDownLogged = true;
  const message = err instanceof Error ? err.message : String(err);
  console.error('[queue] rate-limit Redis unavailable — failing open for this process:', message);
}

/**
 * Hard timeout for Redis ops in this guard path. ioredis is configured with
 * `maxRetriesPerRequest: null` (BullMQ requirement) which means a hung
 * connection retries forever and never throws — making await never resolve.
 * Without this race we'd hang every rate-limited request indefinitely when
 * Redis is unreachable.
 */
const RATE_LIMIT_TIMEOUT_MS = 500;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[queue] ${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function checkRateLimit(opts: CheckRateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = opts.windowSeconds * 1000;
  const bucket = Math.floor(now / windowMs);
  const resetAt = new Date((bucket + 1) * windowMs);
  const redisKey = `rl:${opts.key}:${bucket}`;

  try {
    const redis = getConnection();
    const count = await withTimeout(redis.incr(redisKey), RATE_LIMIT_TIMEOUT_MS, 'rate-limit INCR');
    if (count === 1) {
      // Slightly longer than the window so we never lose the counter to a
      // race between INCR and EXPIRE landing at the boundary.
      await withTimeout(
        redis.pexpire(redisKey, windowMs + 1000),
        RATE_LIMIT_TIMEOUT_MS,
        'rate-limit PEXPIRE',
      );
    }
    const remaining = Math.max(0, opts.limit - count);
    return { allowed: count <= opts.limit, remaining, resetAt };
  } catch (err) {
    logRedisDownOnce(err);
    return {
      allowed: true,
      remaining: opts.limit,
      resetAt: new Date(now + windowMs),
    };
  }
}
