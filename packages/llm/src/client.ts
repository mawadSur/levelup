import OpenAI from 'openai';
import { isStubMode, llmConfig } from './config';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (isStubMode()) {
    throw new Error(
      '[@levelup/llm] getOpenAI() called in stub mode. Branch on isStubMode() before instantiating the client.',
    );
  }
  if (client) return client;
  client = new OpenAI({ apiKey: llmConfig.apiKey });
  return client;
}
