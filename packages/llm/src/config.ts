import type { LlmConfig } from './types';

const PLACEHOLDER_PREFIX = 'PLACEHOLDER_';

function readEnv(): LlmConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  return {
    apiKey: apiKey && apiKey.length > 0 ? apiKey : undefined,
    defaultModel: process.env.OPENAI_MODEL_DEFAULT ?? 'gpt-4o-mini',
    coachModel: process.env.OPENAI_MODEL_COACH ?? 'gpt-4o',
    embedModel: process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small',
    llmSensitiveCheck: (process.env.LLM_SENSITIVE_CHECK ?? '').toLowerCase() === 'on',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };
}

export const llmConfig: LlmConfig = readEnv();

export function isStubMode(): boolean {
  const key = llmConfig.apiKey;
  if (!key) return true;
  if (key.startsWith(PLACEHOLDER_PREFIX)) return true;
  return false;
}

let warned = false;

function enforceStubModePolicy(): void {
  if (!isStubMode()) return;
  if (llmConfig.nodeEnv === 'production') {
    throw new Error(
      '[@levelup/llm] OPENAI_API_KEY is missing or a PLACEHOLDER_ value in production. ' +
        'Set a real key or disable LLM features.',
    );
  }
  if (!warned) {
    warned = true;

    console.warn(
      '[@levelup/llm] Running in STUB MODE — set OPENAI_API_KEY (no PLACEHOLDER_ prefix) for real responses.',
    );
  }
}

enforceStubModePolicy();
