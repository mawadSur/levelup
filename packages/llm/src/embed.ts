import { isStubMode, llmConfig } from './config';
import { getOpenAI } from './client';
import { withRetry } from './retry';
import { stubEmbed } from './stub';

const BATCH_SIZE = 100;

interface OpenAIEmbeddingResponse {
  data?: Array<{ embedding?: number[]; index?: number }>;
}

/**
 * Generate embeddings for an array of texts.
 *
 * Batches up to 100 inputs per OpenAI request and concatenates the results
 * in input order. In stub mode returns deterministic zero vectors of length
 * 1536 (matching text-embedding-3-small) so callers can still exercise
 * vector-store wiring end-to-end.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (isStubMode()) {
    return stubEmbed(texts);
  }

  const model = llmConfig.embedModel;
  const out: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const resp = await withRetry(async () => {
      const openai = getOpenAI();
      return (await openai.embeddings.create({
        model,
        input: slice,
      })) as unknown as OpenAIEmbeddingResponse;
    });
    const data = resp.data ?? [];
    for (let j = 0; j < slice.length; j++) {
      const item = data[j];
      out[i + j] = Array.isArray(item?.embedding) ? item.embedding : [];
    }
  }

  return out;
}
