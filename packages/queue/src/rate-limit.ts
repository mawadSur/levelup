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

export async function checkRateLimit(opts: CheckRateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = opts.windowSeconds * 1000;
  const bucket = Math.floor(now / windowMs);
  const resetAt = new Date((bucket + 1) * windowMs);
  const redisKey = `rl:${opts.key}:${bucket}`;

  try {
    const redis = getConnection();
    const count = await redis.incr(redisKey);
    if (count === 1) {
      // Slightly longer than the window so we never lose the counter to a
      // race between INCR and EXPIRE landing at the boundary.
      await redis.pexpire(redisKey, windowMs + 1000);
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
