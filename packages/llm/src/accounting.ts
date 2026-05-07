import type { UsageRecord } from './types';

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export async function recordUsage(record: UsageRecord): Promise<void> {
  // Placeholder: the API service is expected to wire this to a DB-backed
  // usage table. Kept as a hook so the LLM package stays storage-agnostic.

  console.log('[@levelup/llm] usage', {
    userId: record.userId,
    model: record.model,
    promptTokens: record.promptTokens,
    completionTokens: record.completionTokens,
    totalTokens: record.promptTokens + record.completionTokens,
  });
}
