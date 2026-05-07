import { apiPost } from './client';
import type { DemoResetInput, DemoResetResponse } from '@levelup/types';

/**
 * POST /demo/reset
 *
 * Wipes and reseeds the current demo org with a believable data snapshot
 * shaped around the provided company name. Requires ADMIN role and
 * DEMO_RESET_ENABLED=true on the API server.
 */
export async function reset(input: DemoResetInput): Promise<DemoResetResponse> {
  return apiPost<DemoResetInput, DemoResetResponse>('/demo/reset', input);
}
