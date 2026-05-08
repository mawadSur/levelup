import { Plan, BillingInterval } from '@levelup/db';
import { billingConfig, isStubMode, getStripePriceId } from './config';
import { getStripe } from './stripe';
import { isPerSeat, requiresSales, getPlanConfig } from './plan';
import { stubCheckoutSession, stubBillingPortalSession, stubSeatProration } from './stub';
import type {
  CreateCheckoutSessionInput,
  CheckoutSessionResult,
  CreateBillingPortalSessionInput,
  BillingPortalSessionResult,
  SeatProrationPreview,
} from './types';

// ---------------------------------------------------------------------------
// Checkout Session
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe Checkout Session for a subscription.
 *
 * Per-seat tiers (TEAM, GROWTH) bill `quantity` seats at the price configured
 * for the (plan, interval) pair. Flat-rate tiers (STARTER) ignore quantity.
 *
 * Returns null for plans that don't go through Checkout:
 *   - TRIAL — initialised in-app via the trial-init flow
 *   - ENTERPRISE — sales-led; UI must redirect to a sales contact form
 *
 * Stub mode: returns a deterministic fake URL and session ID without any
 * network calls.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSessionResult | null> {
  const {
    organizationId,
    customerId,
    plan,
    interval = BillingInterval.MONTHLY,
    quantity,
    successPath = '/billing/success',
    cancelPath = '/billing/cancel',
  } = input;

  // TRIAL doesn't go through Checkout — caller should run the trial-init flow.
  if (plan === Plan.TRIAL) return null;

  // ENTERPRISE is sales-led — caller should hand off to a sales contact form.
  if (requiresSales(plan)) return null;

  if (isStubMode()) {
    return stubCheckoutSession(organizationId, plan);
  }

  const stripe = getStripe();

  const priceId = getStripePriceId(plan, interval);
  if (!priceId) {
    throw new Error(
      `[@levelup/billing] No Stripe price ID configured for plan "${plan}" / interval "${interval}". ` +
        'Set the corresponding STRIPE_PRICE_<TIER>_<INTERVAL> environment variable.',
    );
  }

  // Per-seat tiers must pass a quantity; flat-rate ignore it.
  let lineItemQuantity = 1;
  if (isPerSeat(plan)) {
    const cfg = getPlanConfig(plan);
    if (!cfg.perSeat) throw new Error('unreachable');
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
      throw new Error(`[@levelup/billing] quantity is required for per-seat plan "${plan}".`);
    }
    if (quantity < cfg.minSeats || quantity > cfg.maxSeats) {
      throw new Error(
        `[@levelup/billing] quantity ${quantity} outside allowed range [${cfg.minSeats}..${cfg.maxSeats}] for plan "${plan}".`,
      );
    }
    lineItemQuantity = quantity;
  }

  const successUrl = `${billingConfig.appUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${billingConfig.appUrl}${cancelPath}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: lineItemQuantity }],
    ...(customerId ? { customer: customerId } : {}),
    client_reference_id: organizationId,
    metadata: { organizationId, plan, interval, quantity: String(lineItemQuantity) },
    subscription_data: {
      metadata: { organizationId, plan, interval },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    throw new Error('[@levelup/billing] Stripe did not return a checkout URL.');
  }

  return { url: session.url, sessionId: session.id };
}

// ---------------------------------------------------------------------------
// Billing Portal Session
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe Billing Portal session for an existing customer.
 *
 * Stub mode: returns a deterministic fake portal URL.
 *
 * Real mode: creates a portal session that returns the customer to
 * `returnPath` (defaults to `/billing`).
 */
export async function createBillingPortalSession(
  input: CreateBillingPortalSessionInput,
): Promise<BillingPortalSessionResult> {
  const { customerId, returnPath = '/billing' } = input;

  if (isStubMode()) {
    return stubBillingPortalSession();
  }

  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${billingConfig.appUrl}${returnPath}`,
  });

  return { url: session.url };
}

// ---------------------------------------------------------------------------
// Seat add-on / proration
// ---------------------------------------------------------------------------

/**
 * Preview the prorated cost of changing a subscription's seat quantity.
 *
 * Stripe computes the proration by simulating an upcoming invoice with the
 * proposed quantity change. We return the immediate amount due in cents and
 * the new quantity so the UI can render an "Add N seats for $X" confirmation
 * without committing the change.
 *
 * In stub mode returns a deterministic estimate so dev flows can render the
 * modal without hitting Stripe.
 */
export async function previewSeatProration(args: {
  subscriptionId: string;
  newQuantity: number;
}): Promise<SeatProrationPreview> {
  const { subscriptionId, newQuantity } = args;

  if (isStubMode()) {
    return stubSeatProration(newQuantity);
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  if (!item) {
    throw new Error(`[@levelup/billing] subscription ${subscriptionId} has no line items.`);
  }

  const prorationDate = Math.floor(Date.now() / 1000);

  // Stripe's upcoming-invoice endpoint computes proration as if the change
  // were applied right now. We sum the prorated invoice line items (positive
  // and negative) into a single net amount.
  const upcoming = await stripe.invoices.retrieveUpcoming({
    customer:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    subscription: subscriptionId,
    subscription_items: [{ id: item.id, quantity: newQuantity }],
    subscription_proration_date: prorationDate,
  });

  const prorationLines = upcoming.lines.data.filter(
    (line) => line.period.start === prorationDate || line.proration,
  );
  const amountDueCents = prorationLines.reduce((sum, line) => sum + line.amount, 0);

  return {
    amountDueCents: Math.max(0, amountDueCents),
    currency: upcoming.currency,
    prorationDate,
    newQuantity,
  };
}

/**
 * Apply a quantity change to an existing subscription with proration billed
 * immediately. Used by the seat add-on flow after the customer confirms the
 * preview.
 */
export async function updateSubscriptionQuantity(args: {
  subscriptionId: string;
  newQuantity: number;
}): Promise<{ subscriptionId: string; newQuantity: number }> {
  const { subscriptionId, newQuantity } = args;

  if (isStubMode()) {
    return { subscriptionId, newQuantity };
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  if (!item) {
    throw new Error(`[@levelup/billing] subscription ${subscriptionId} has no line items.`);
  }

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, quantity: newQuantity }],
    proration_behavior: 'always_invoice',
  });

  return { subscriptionId, newQuantity };
}
