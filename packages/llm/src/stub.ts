import type {
  ChatCompleteOptions,
  ChatCompleteResult,
  ChatStreamChunk,
  ChatUsage,
  CoachInput,
  CoachOutput,
  CoachStreamChunk,
  CoachSensitiveWarning,
} from './types';
import { estimateTokens } from './accounting';

const STUB_PREFIX = '[STUB MODE] ';
const STUB_NOTICE = 'STUB MODE — set OPENAI_API_KEY to enable real responses.';
const EMBED_DIM = 1536;

function lastUserMessage(opts: ChatCompleteOptions): string {
  for (let i = opts.messages.length - 1; i >= 0; i--) {
    const m = opts.messages[i];
    if (m && m.role === 'user') return m.content;
  }
  return '';
}

function fakeUsage(prompt: string, completion: string): ChatUsage {
  const promptTokens = estimateTokens(prompt);
  const completionTokens = estimateTokens(completion);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

function buildStubText(opts: ChatCompleteOptions): string {
  const last = lastUserMessage(opts);
  return `${STUB_PREFIX}${STUB_NOTICE}\n\nEcho: ${last.slice(0, 500)}`;
}

export function stubChatComplete(opts: ChatCompleteOptions): ChatCompleteResult {
  const content = buildStubText(opts);
  const promptText = opts.messages.map((m) => m.content).join('\n');
  return {
    content,
    model: opts.model ?? 'stub-model',
    usage: fakeUsage(promptText, content),
    finishReason: 'stop',
    stub: true,
  };
}

export async function* stubChatStream(opts: ChatCompleteOptions): AsyncIterable<ChatStreamChunk> {
  const content = buildStubText(opts);
  const promptText = opts.messages.map((m) => m.content).join('\n');
  const chunks = content.match(/.{1,32}/gs) ?? [content];
  for (const c of chunks) {
    yield { type: 'delta', content: c };
  }
  yield {
    type: 'usage',
    usage: fakeUsage(promptText, content),
    model: opts.model ?? 'stub-model',
    finishReason: 'stop',
    stub: true,
  };
}

// Embeddings: deterministic zero vectors of length 1536. The dimension matches
// OpenAI text-embedding-3-small so callers can wire DB columns the same way
// in stub mode. Documented so reviewers know zero vectors are intentional.
export function stubEmbed(texts: string[]): number[][] {
  return texts.map(() => new Array<number>(EMBED_DIM).fill(0));
}

export function stubCoach(input: CoachInput, model: string): CoachOutput {
  const warning: CoachSensitiveWarning = { triggered: false };
  const explanation = `${STUB_PREFIX}${STUB_NOTICE}\n\nHere's a stubbed coach reply tailored to a ${input.aiLevel} ${input.jobTitle} in ${input.department}. Real guidance will appear once a live key is configured.`;
  const improvedPrompt = `As a ${input.jobTitle} in ${input.department}, ${input.userInput.trim()} — please respond step-by-step with examples relevant to my role and avoid any sensitive data.`;
  const completion = [explanation, improvedPrompt].join('\n');
  const promptText = input.userInput;
  return {
    explanation,
    improvedPrompt,
    whyItWorks:
      'It states the role, the goal, and the constraints up front, which gives the model the context it needs to give a useful, role-aware answer.',
    nextAction:
      'Try the improved prompt in the AI coach and review the response with your team lead.',
    sensitiveDataWarning: warning,
    model,
    usage: fakeUsage(promptText, completion),
    stub: true,
  };
}

export async function* stubCoachStream(
  input: CoachInput,
  model: string,
): AsyncIterable<CoachStreamChunk> {
  const out = stubCoach(input, model);
  yield { type: 'sensitive', warning: out.sensitiveDataWarning };
  yield { type: 'delta', field: 'explanation', content: out.explanation };
  if (out.improvedPrompt)
    yield { type: 'delta', field: 'improvedPrompt', content: out.improvedPrompt };
  if (out.whyItWorks) yield { type: 'delta', field: 'whyItWorks', content: out.whyItWorks };
  if (out.nextAction) yield { type: 'delta', field: 'nextAction', content: out.nextAction };
  yield { type: 'final', output: out };
}
