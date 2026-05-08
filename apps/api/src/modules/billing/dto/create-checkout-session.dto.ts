import { z } from 'zod';
import { Plan, BillingInterval } from '@levelup/db';

/**
 * Body schema for POST /billing/checkout.
 *
 * - `plan` is required.
 * - `interval` defaults to MONTHLY when omitted.
 * - `quantity` is required for per-seat tiers (TEAM, GROWTH); ignored for
 *   flat-rate (STARTER). The controller validates the range against the
 *   plan's min/max seats.
 */
export const createCheckoutSessionBodySchema = z.object({
  plan: z.nativeEnum(Plan),
  interval: z.nativeEnum(BillingInterval).optional(),
  quantity: z.number().int().min(1).max(10_000).optional(),
});

export type CreateCheckoutSessionBodyDto = z.infer<typeof createCheckoutSessionBodySchema>;

/**
 * Body schema for POST /billing/seats/add.
 * `quantity` is the *new total* seat count to set on the subscription.
 */
export const addSeatsBodySchema = z.object({
  quantity: z.number().int().min(1).max(10_000),
});
export type AddSeatsBodyDto = z.infer<typeof addSeatsBodySchema>;

/**
 * Query schema for GET /billing/seats/preview.
 * `delta` is the number of seats to add (positive) or remove (negative) from
 * the current subscription quantity.
 */
export const previewSeatsQuerySchema = z.object({
  delta: z.coerce.number().int(),
});
export type PreviewSeatsQueryDto = z.infer<typeof previewSeatsQuerySchema>;
