import { z } from 'zod';
import { Plan, BillingInterval } from '@levelup/db';

export const createCheckoutSessionSchema = z.object({
  plan: z.nativeEnum(Plan),
  interval: z.nativeEnum(BillingInterval).optional(),
  quantity: z.number().int().min(1).max(10_000).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

export const checkoutSessionResponseSchema = z.object({
  url: z.string().url(),
  sessionId: z.string(),
});
export type CheckoutSessionResponse = z.infer<typeof checkoutSessionResponseSchema>;

export const stripeWebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});
export type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>;
