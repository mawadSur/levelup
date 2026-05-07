import type Stripe from 'stripe';
import type { Plan } from '@levelup/db';

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface CreateCheckoutSessionInput {
  organizationId: string;
  customerId?: string;
  plan: Plan;
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
// Webhook parsed event union
// ---------------------------------------------------------------------------

export interface SubscriptionCreatedEvent {
  type: 'subscription.created';
  organizationId: string;
  plan: Plan;
  subscriptionId: string;
  customerId: string;
}

export interface SubscriptionUpdatedEvent {
  type: 'subscription.updated';
  organizationId: string;
  plan: Plan;
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
