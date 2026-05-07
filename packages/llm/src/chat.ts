import type {
  ChatCompleteOptions,
  ChatCompleteResult,
  ChatMessage,
  ChatStreamChunk,
  ChatUsage,
  ResponseFormat,
} from './types';
import { isStubMode, llmConfig } from './config';
import { getOpenAI } from './client';
import { withRetry } from './retry';
import { stubChatComplete, stubChatStream } from './stub';

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
};

function toOpenAIMessages(messages: ChatMessage[]): OpenAIMessage[] {
  return messages.map((m) => {
    const base: OpenAIMessage = { role: m.role, content: m.content };
    if (m.name) base.name = m.name;
    return base;
  });
}

function toOpenAIResponseFormat(rf: ResponseFormat | undefined): unknown {
  if (!rf || rf === 'text') return undefined;
  return {
    type: 'json_schema',
    json_schema: {
      name: rf.name,
      schema: rf.schema,
      strict: true,
    },
  };
}

interface OpenAIChatChoice {
  message?: { content?: string | null };
  finish_reason?: string | null;
}
interface OpenAIChatCompletion {
  choices?: OpenAIChatChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  model?: string;
}

function pickUsage(u: OpenAIChatCompletion['usage']): ChatUsage {
  const promptTokens = u && typeof u.prompt_tokens === 'number' ? u.prompt_tokens : 0;
  const completionTokens = u && typeof u.completion_tokens === 'number' ? u.completion_tokens : 0;
  const totalTokens =
    u && typeof u.total_tokens === 'number' ? u.total_tokens : promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

/**
 * Non-streaming chat completion.
 *
 * Prompt-cache invariant: callers MUST place the system prompt as the FIRST
 * message and keep its content byte-identical across turns of the same
 * conversation. OpenAI's automatic prompt cache only matches identical
 * leading prefixes, so any mutation (date stamps, per-turn user info) drops
 * the cache hit and roughly doubles cost/latency on long system prompts.
 */
export async function chatComplete(opts: ChatCompleteOptions): Promise<ChatCompleteResult> {
  if (isStubMode()) {
    return stubChatComplete(opts);
  }

  const model = opts.model ?? llmConfig.defaultModel;
  const temperature = opts.temperature ?? 0.7;

  const body: Record<string, unknown> = {
    model,
    messages: toOpenAIMessages(opts.messages),
    temperature,
  };
  if (typeof opts.maxTokens === 'number') body.max_tokens = opts.maxTokens;
  if (opts.userId) body.user = opts.userId;
  const rf = toOpenAIResponseFormat(opts.responseFormat);
  if (rf) body.response_format = rf;

  const result = await withRetry(async () => {
    const openai = getOpenAI();
    const resp = (await openai.chat.completions.create(
      body as unknown as Parameters<typeof openai.chat.completions.create>[0],
    )) as unknown as OpenAIChatCompletion;
    return resp;
  });

  const choice = result.choices?.[0];
  const content = choice?.message?.content ?? '';
  return {
    content,
    model: result.model ?? model,
    usage: pickUsage(result.usage),
    finishReason: choice?.finish_reason ?? null,
    stub: false,
  };
}

interface OpenAIStreamDelta {
  choices?: Array<{
    delta?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  model?: string;
}

/**
 * Streaming chat completion.
 *
 * Prompt-cache invariant: see `chatComplete`. Yields `{ type: 'delta' }`
 * chunks for content deltas and a final `{ type: 'usage' }` event.
 */
export async function* chatStream(opts: ChatCompleteOptions): AsyncIterable<ChatStreamChunk> {
  if (isStubMode()) {
    yield* stubChatStream(opts);
    return;
  }

  const model = opts.model ?? llmConfig.defaultModel;
  const temperature = opts.temperature ?? 0.7;

  const body: Record<string, unknown> = {
    model,
    messages: toOpenAIMessages(opts.messages),
    temperature,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (typeof opts.maxTokens === 'number') body.max_tokens = opts.maxTokens;
  if (opts.userId) body.user = opts.userId;
  const rf = toOpenAIResponseFormat(opts.responseFormat);
  if (rf) body.response_format = rf;

  const stream = await withRetry(async () => {
    const openai = getOpenAI();
    return (await openai.chat.completions.create(
      body as unknown as Parameters<typeof openai.chat.completions.create>[0],
    )) as unknown as AsyncIterable<OpenAIStreamDelta>;
  });

  let finalUsage: ChatUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let finishReason: string | null = null;
  let resolvedModel = model;

  for await (const part of stream) {
    if (part.model) resolvedModel = part.model;
    const choice = part.choices?.[0];
    const deltaContent = choice?.delta?.content;
    if (typeof deltaContent === 'string' && deltaContent.length > 0) {
      yield { type: 'delta', content: deltaContent };
    }
    if (choice?.finish_reason) finishReason = choice.finish_reason;
    if (part.usage) finalUsage = pickUsage(part.usage);
  }

  yield {
    type: 'usage',
    usage: finalUsage,
    model: resolvedModel,
    finishReason,
    stub: false,
  };
}
