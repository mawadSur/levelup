import { apiGet } from './client';
import type {
  TopPromptsResponse,
  TopSavedPromptsResponse,
  UsageTrendResponse,
  SavesPreventedResponse,
  CategoryMixResponse,
  InsightsPeriod,
  InsightsTrendPeriod,
  InsightsTrendInterval,
} from '@levelup/types';

// ---------------------------------------------------------------------------
// Query param shapes
// ---------------------------------------------------------------------------

export interface TopPromptsParams {
  period?: InsightsPeriod;
  limit?: number;
}

export interface UsageTrendParams {
  period?: InsightsTrendPeriod;
  interval?: InsightsTrendInterval;
}

export interface CategoryMixParams {
  period?: InsightsPeriod;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getTopPrompts(params?: TopPromptsParams): Promise<TopPromptsResponse> {
  return apiGet<TopPromptsResponse>('/insights/top-prompts', {
    params: {
      ...(params?.period ? { period: params.period } : {}),
      ...(params?.limit !== undefined ? { limit: params.limit } : {}),
    },
  });
}

export async function getTopSavedPrompts(
  params?: TopPromptsParams,
): Promise<TopSavedPromptsResponse> {
  return apiGet<TopSavedPromptsResponse>('/insights/top-saved-prompts', {
    params: {
      ...(params?.period ? { period: params.period } : {}),
      ...(params?.limit !== undefined ? { limit: params.limit } : {}),
    },
  });
}

export async function getUsageTrend(params?: UsageTrendParams): Promise<UsageTrendResponse> {
  return apiGet<UsageTrendResponse>('/insights/usage-trend', {
    params: {
      ...(params?.period ? { period: params.period } : {}),
      ...(params?.interval ? { interval: params.interval } : {}),
    },
  });
}

export async function getSavesPrevented(): Promise<SavesPreventedResponse> {
  return apiGet<SavesPreventedResponse>('/insights/saves-prevented');
}

export async function getCategoryMix(params?: CategoryMixParams): Promise<CategoryMixResponse> {
  return apiGet<CategoryMixResponse>('/insights/category-mix', {
    params: {
      ...(params?.period ? { period: params.period } : {}),
    },
  });
}
