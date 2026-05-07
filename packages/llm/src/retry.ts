import type { RetryOptions } from './types';

function defaultIsRetryable(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { status?: unknown; statusCode?: unknown; code?: unknown };
  const status =
    typeof e.status === 'number'
      ? e.status
      : typeof e.statusCode === 'number'
        ? e.statusCode
        : undefined;
  if (typeof status === 'number') {
    if (status === 429) return true;
    if (status >= 500 && status <= 599) return true;
  }
  const code = typeof e.code === 'string' ? e.code : '';
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN') return true;
  return false;
}

function jitteredDelay(base: number, attempt: number, max: number): number {
  const exp = Math.min(max, base * Math.pow(2, attempt - 1));
  const jitter = Math.random() * exp * 0.25;
  return Math.min(max, exp + jitter);
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 4000;
  const isRetryable = opts.isRetryable ?? defaultIsRetryable;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      if (attempt === maxAttempts || !isRetryable(err)) {
        throw err;
      }
      const delay = jitteredDelay(baseDelayMs, attempt, maxDelayMs);
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('withRetry: exhausted retries');
}
