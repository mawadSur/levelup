import type Stripe from 'stripe';
import type { Plan, BillingInterval } from '@levelup/db';

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface CreateCheckoutSessionInput {
  organizationId: string;
  customerId?: string;
  plan: Plan;
  /** Billing cycle: monthly or annual. Defaults to MONTHLY when omitted. */
  interval?: BillingInterval;
  /** Number of seats to purchase. Required for per-seat tiers; ignored for flat-rate. */
  quantity?: number;
  successPath?: string;
  cancelPath?: string;
}

export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

export interface CreateBillingPortalSessionInput {
  customerId: string;
  returnPath?: string;
}

export interface BillingPortalSessionResult {
  url: string;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export interface EnsureCustomerInput {
  organizationId: string;
  email: string;
  name: string;
  existingCustomerId?: string | null;
}

export interface EnsureCustomerResult {
  customerId: string;
  created: boolean;
}

// ---------------------------------------------------------------------------
// Seat proration
// ---------------------------------------------------------------------------

export interface SeatProrationPreview {
  /** Net amount in cents the customer will be charged immediately. */
  amountDueCents: number;
  /** Currency lower-cased, e.g. "usd". */
  currency: string;
  /** Date the proration applies on (Unix epoch seconds). */
  prorationDate: number;
  /** New total seat count after applying the delta. */
  newQuantity: number;
}

// ---------------------------------------------------------------------------
// Webhook parsed event union
// ---------------------------------------------------------------------------

export interface SubscriptionCreatedEvent {
  type: 'subscription.created';
  organizationId: string;
  plan: Plan;
  interval: BillingInterval;
  quantity: number;
  priceId: string;
  status: string;
  subscriptionId: string;
  customerId: string;
}

export interface SubscriptionUpdatedEvent {
  type: 'subscription.updated';
  organizationId: string;
  plan: Plan;
  interval: BillingInterval;
  quantity: number;
  priceId: string;
  subscriptionId: string;
  status: string;
}

export interface SubscriptionDeletedEvent {
  type: 'subscription.deleted';
  organizationId: string;
  subscriptionId: string;
}

export interface CheckoutCompletedEvent {
  type: 'checkout.completed';
  organizationId: string;
  plan: Plan;
  interval: BillingInterval;
  customerId: string;
}

export interface InvoicePaymentFailedEvent {
  type: 'invoice.payment_failed';
  organizationId: string;
  subscriptionId: string;
}

export interface UnknownBillingEvent {
  type: 'unknown';
  raw: Stripe.Event;
}

export type ParsedBillingEvent =
  | SubscriptionCreatedEvent
  | SubscriptionUpdatedEvent
  | SubscriptionDeletedEvent
  | CheckoutCompletedEvent
  | InvoicePaymentFailedEvent
  | UnknownBillingEvent;
