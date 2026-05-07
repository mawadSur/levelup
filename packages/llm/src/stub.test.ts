/**
 * @levelup/llm — stub module unit tests
 *
 * Verifies the contract of the stub responses used when OPENAI_API_KEY is a
 * PLACEHOLDER_ value. Tests import the stub functions directly to avoid
 * side-effects from other modules.
 *
 * Run: pnpm --filter @levelup/llm test
 */

process.env['OPENAI_API_KEY'] = 'PLACEHOLDER_test';
process.env['NODE_ENV'] = 'test';

import { describe, it, expect } from 'vitest';
import { stubChatComplete, stubChatStream, stubEmbed, stubCoach } from './stub';
import type { ChatCompleteOptions, CoachInput } from './types';

// ---- helpers ----------------------------------------------------------------

const baseChatOpts: ChatCompleteOptions = {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is prompt engineering?' },
  ],
};

const baseCoachInput: CoachInput = {
  userInput: 'How do I write a good AI prompt for summarising reports?',
  jobTitle: 'Data Analyst',
  department: 'Finance',
  aiLevel: 'beginner',
  companyPolicy: 'Do not share customer data externally.',
};

// ---- suite ------------------------------------------------------------------

describe('stubChatComplete', () => {
  it('includes "STUB MODE" in the response content', () => {
    const result = stubChatComplete(baseChatOpts);
    expect(result.content).toContain('STUB MODE');
  });

  it('echoes the last user message', () => {
    const result = stubChatComplete(baseChatOpts);
    expect(result.content).toContain('What is prompt engineering?');
  });

  it('marks stub:true', () => {
    const result = stubChatComplete(baseChatOpts);
    expect(result.stub).toBe(true);
  });

  it('returns a finishReason of "stop"', () => {
    const result = stubChatComplete(baseChatOpts);
    expect(result.finishReason).toBe('stop');
  });

  it('returns non-zero usage tokens', () => {
    const result = stubChatComplete(baseChatOpts);
    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
    expect(result.usage.totalTokens).toBe(
      result.usage.promptTokens + result.usage.completionTokens,
    );
  });
});

describe('stubChatStream', () => {
  it('yields delta chunks and a final usage chunk containing "STUB MODE"', async () => {
    const chunks = [];
    let fullContent = '';
    for await (const chunk of stubChatStream(baseChatOpts)) {
      chunks.push(chunk);
      if (chunk.type === 'delta') fullContent += chunk.content;
    }
    expect(fullContent).toContain('STUB MODE');

    const usageChunk = chunks.find((c) => c.type === 'usage');
    expect(usageChunk).toBeDefined();
    if (usageChunk?.type === 'usage') {
      expect(usageChunk.stub).toBe(true);
    }
  });
});

describe('stubEmbed', () => {
  it('returns a vector of length 1536 for each input', () => {
    const texts = ['hello world', 'foo bar baz'];
    const result = stubEmbed(texts);
    expect(result).toHaveLength(2);
    for (const vec of result) {
      expect(vec).toHaveLength(1536);
    }
  });

  it('fills the vector with zeros (deterministic)', () => {
    const [vec] = stubEmbed(['test']);
    expect(vec).toBeDefined();
    expect(vec!.every((n) => n === 0)).toBe(true);
  });

  it('handles an empty input array', () => {
    const result = stubEmbed([]);
    expect(result).toHaveLength(0);
  });
});

describe('stubCoach', () => {
  it('includes "STUB MODE" in the explanation', () => {
    const result = stubCoach(baseCoachInput, 'stub-model');
    expect(result.explanation).toContain('STUB MODE');
  });

  it('sets stub:true', () => {
    const result = stubCoach(baseCoachInput, 'stub-model');
    expect(result.stub).toBe(true);
  });

  it('returns a sensitiveDataWarning with triggered:false', () => {
    const result = stubCoach(baseCoachInput, 'stub-model');
    expect(result.sensitiveDataWarning.triggered).toBe(false);
  });

  it('returns an improvedPrompt string', () => {
    const result = stubCoach(baseCoachInput, 'stub-model');
    expect(typeof result.improvedPrompt).toBe('string');
    expect((result.improvedPrompt ?? '').length).toBeGreaterThan(0);
  });

  it('uses the provided model name', () => {
    const result = stubCoach(baseCoachInput, 'gpt-4o-mini');
    expect(result.model).toBe('gpt-4o-mini');
  });
});
