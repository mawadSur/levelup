// Re-export Plan + BillingInterval enums from @levelup/db for consumer convenience
export { Plan, BillingInterval } from '@levelup/db';

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
  InvoicePaymentSucceededEvent,
  UnknownBillingEvent,
  ParsedBillingEvent,
  SeatProrationPreview,
} from './types';

// Config utilities
export {
  billingConfig,
  isStubMode,
  priceToPlan,
  planToPrice,
  getStripePriceId,
  getStripePriceIdOrThrow,
} from './config';
export type { BillingConfig } from './config';

// Stripe singleton
export { getStripe } from './stripe';

// Checkout
export {
  createCheckoutSession,
  createBillingPortalSession,
  previewSeatProration,
  updateSubscriptionQuantity,
  CheckoutNotApplicableError,
} from './checkout';

// Customer
export { ensureCustomer } from './customer';

// Webhook
export { verifyWebhook, parseEvent } from './webhook';

// Plan utilities
export {
  PLAN_CONFIG,
  getPlanConfig,
  getPlanLimit,
  isPerSeat,
  requiresSales,
  getMonthlyPrice,
  getCyclePrice,
  planFromPriceId,
  planAndIntervalFromPriceId,
  planSeatsFor,
  isWithinSeatLimit,
  priceFor,
} from './plan';
export type { PlanConfig, FlatPlanConfig, PerSeatPlanConfig } from './plan';
