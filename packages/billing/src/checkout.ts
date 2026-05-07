import { billingConfig, isStubMode } from './config';
import { getStripe } from './stripe';
import { priceFor } from './plan';
import { stubCheckoutSession, stubBillingPortalSession } from './stub';
import type {
  CreateCheckoutSessionInput,
  CheckoutSessionResult,
  CreateBillingPortalSessionInput,
  BillingPortalSessionResult,
} from './types';

// ---------------------------------------------------------------------------
// Checkout Session
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe Checkout Session for a subscription.
 *
 * Stub mode: returns a deterministic fake URL and session ID without any
 * network calls.
 *
 * Real mode: creates a Stripe Checkout Session in `subscription` mode with
 * the price for the requested plan, attaches the customer when provided,
 * and sets `client_reference_id` + `metadata` for post-checkout webhook
 * processing.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSessionResult> {
  const {
    organizationId,
    customerId,
    plan,
    successPath = '/billing/success',
    cancelPath = '/billing/cancel',
  } = input;

  if (isStubMode()) {
    return stubCheckoutSession(organizationId, plan);
  }

  const stripe = getStripe();

  const priceId = priceFor(plan);
  if (!priceId) {
    throw new Error(
      `[@levelup/billing] No Stripe price ID configured for plan "${plan}". ` +
        'Set the corresponding STRIPE_PRICE_* environment variable.',
    );
  }

  const successUrl = `${billingConfig.appUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${billingConfig.appUrl}${cancelPath}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    ...(customerId ? { customer: customerId } : {}),
    client_reference_id: organizationId,
    metadata: { organizationId, plan },
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
