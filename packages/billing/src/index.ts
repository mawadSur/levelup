// Re-export Plan enum from @levelup/db for consumer convenience
export { Plan } from '@levelup/db';

// Types
export type {
  CreateCheckoutSessionInput,
  CheckoutSessionResult,
  CreateBillingPortalSessionInput,
  BillingPortalSessionResult,
  EnsureCustomerInput,
  EnsureCustomerResult,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
  SubscriptionDeletedEvent,
  CheckoutCompletedEvent,
  InvoicePaymentFailedEvent,
  UnknownBillingEvent,
  ParsedBillingEvent,
} from './types';

// Config utilities
export { billingConfig, isStubMode, priceToPlan, planToPrice } from './config';
export type { BillingConfig } from './config';

// Stripe singleton
export { getStripe } from './stripe';

// Checkout
export { createCheckoutSession, createBillingPortalSession } from './checkout';

// Customer
export { ensureCustomer } from './customer';

// Webhook
export { verifyWebhook, parseEvent } from './webhook';

// Plan utilities
export { planFromPriceId, planSeatsFor, isWithinSeatLimit, priceFor } from './plan';
