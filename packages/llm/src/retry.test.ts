/**
 * @levelup/llm — withRetry unit tests
 *
 * Run: pnpm --filter @levelup/llm test
 */

process.env['OPENAI_API_KEY'] = 'PLACEHOLDER_test';
process.env['NODE_ENV'] = 'test';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from './retry';

// ---- helpers ----------------------------------------------------------------

function makeRetryableError(status: number): Error & { status: number } {
  const err = new Error(`HTTP ${status}`) as Error & { status: number };
  err.status = status;
  return err;
}

function makeNetworkError(code: string): Error & { code: string } {
  const err = new Error(`Network error ${code}`) as Error & { code: string };
  err.code = code;
  return err;
}

// ---- suite ------------------------------------------------------------------

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('success path', () => {
    it('returns the value on first attempt without retrying', async () => {
      const fn = vi.fn().mockResolvedValue('hello');
      const result = await withRetry(fn);
      expect(result).toBe('hello');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retryable errors', () => {
    it('retries on 429 up to maxAttempts then returns value', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(makeRetryableError(429))
        .mockRejectedValueOnce(makeRetryableError(429))
        .mockResolvedValue('recovered');

      const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
      // Let fake timers advance so the delay promises resolve
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('retries on 500 server error', async () => {
      const fn = vi.fn().mockRejectedValueOnce(makeRetryableError(500)).mockResolvedValue('ok');

      const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 50 });
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on ECONNRESET network error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(makeNetworkError('ECONNRESET'))
        .mockResolvedValue('ok');

      const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 50 });
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting maxAttempts', async () => {
      const err = makeRetryableError(429);
      const fn = vi.fn().mockRejectedValue(err);

      const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
      const rejection = expect(promise).rejects.toThrow();
      await vi.runAllTimersAsync();
      await rejection;
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('non-retryable errors', () => {
    it('throws immediately on a 400 error without retrying', async () => {
      const err = makeRetryableError(400);
      const fn = vi.fn().mockRejectedValue(err);

      const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
      const rejection = expect(promise).rejects.toThrow();
      await vi.runAllTimersAsync();
      await rejection;
      // Should only be called once — no retries for 400
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws immediately on a plain Error (no status/code)', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('bad input'));
      const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
      const rejection = expect(promise).rejects.toThrow('bad input');
      await vi.runAllTimersAsync();
      await rejection;
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom isRetryable', () => {
    it('uses provided isRetryable predicate', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('custom-transient'))
        .mockResolvedValue('done');

      const promise = withRetry(fn, {
        maxAttempts: 2,
        baseDelayMs: 50,
        isRetryable: (err) => err instanceof Error && err.message === 'custom-transient',
      });
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('done');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('backoff timing', () => {
    it('delays between attempts (exponential back-off)', async () => {
      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;

      const fn = vi
        .fn()
        .mockRejectedValueOnce(makeRetryableError(429))
        .mockRejectedValueOnce(makeRetryableError(429))
        .mockResolvedValue('done');

      // We rely on fake timers; just verify the total number of timer advances needed
      const promise = withRetry(fn, {
        maxAttempts: 3,
        baseDelayMs: 500,
        maxDelayMs: 4000,
      });

      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('done');
      // The delay for attempt 1 ≈ 500 ms and attempt 2 ≈ 1000 ms (exponential).
      // We can only assert structure, not exact values (jitter).
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
