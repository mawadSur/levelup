import { apiGet } from './client';
import type { SearchResponse } from '@levelup/types';

/**
 * Search lessons and prompts by query string.
 * Returns semantic hits (pgvector cosine similarity) or text-fallback results.
 * The response includes `stub: true` when semantic search is unavailable.
 */
export async function searchAll(query: string, limit?: number): Promise<SearchResponse> {
  return apiGet<SearchResponse>('/search', {
    params: {
      q: query,
      ...(limit !== undefined ? { limit } : {}),
    },
  });
}
