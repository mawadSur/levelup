/**
 * @levelup/llm — estimateTokens / recordUsage unit tests
 *
 * Run: pnpm --filter @levelup/llm test
 */

process.env['OPENAI_API_KEY'] = 'PLACEHOLDER_test';
process.env['NODE_ENV'] = 'test';

import { describe, it, expect } from 'vitest';
import { estimateTokens, recordUsage } from './accounting';

describe('estimateTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns ceil(length / 4)', () => {
    const text = 'Hello, world!'; // length = 13 → ceil(13/4) = 4
    expect(estimateTokens(text)).toBe(Math.ceil(text.length / 4));
  });

  it('returns approximately length/4 for a typical English paragraph', () => {
    const text = 'The quick brown fox jumps over the lazy dog. '.repeat(10);
    const estimate = estimateTokens(text);
    const approx = text.length / 4;
    // Within 10% of exact ceil
    expect(estimate).toBeGreaterThanOrEqual(Math.floor(approx * 0.9));
    expect(estimate).toBeLessThanOrEqual(Math.ceil(approx * 1.1) + 1);
  });

  it('handles a single character', () => {
    expect(estimateTokens('a')).toBe(1); // ceil(1/4)
  });

  it('handles exactly 4 characters', () => {
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('handles exactly 5 characters', () => {
    expect(estimateTokens('abcde')).toBe(2); // ceil(5/4) = 2
  });

  it('handles a 100-character string', () => {
    const text = 'a'.repeat(100);
    expect(estimateTokens(text)).toBe(25); // 100/4
  });
});

describe('recordUsage', () => {
  it('does not throw for a valid usage record', async () => {
    await expect(
      recordUsage({
        userId: 'user_123',
        model: 'gpt-4o-mini',
        promptTokens: 100,
        completionTokens: 50,
      }),
    ).resolves.not.toThrow();
  });

  it('does not throw for zero-token record', async () => {
    await expect(
      recordUsage({
        userId: 'user_abc',
        model: 'stub-model',
        promptTokens: 0,
        completionTokens: 0,
      }),
    ).resolves.not.toThrow();
  });
});
