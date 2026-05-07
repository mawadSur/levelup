import { z } from 'zod';
import { Plan } from '@levelup/db';

/**
 * Body schema for POST /billing/checkout.
 * Only the plan is required from the caller — customer and org are resolved
 * server-side from the authenticated session.
 */
export const createCheckoutSessionBodySchema = z.object({
  plan: z.nativeEnum(Plan),
});

export type CreateCheckoutSessionBodyDto = z.infer<typeof createCheckoutSessionBodySchema>;
