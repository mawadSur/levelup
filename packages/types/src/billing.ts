import { z } from 'zod';
import { Plan } from '@levelup/db';

export const createCheckoutSessionSchema = z.object({
  plan: z.nativeEnum(Plan),
  seats: z.number().int().min(1).max(10_000),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
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
