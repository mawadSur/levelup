import type Stripe from 'stripe';
import { billingConfig, isStubMode } from './config';
import { getStripe } from './stripe';
import { planFromPriceId } from './plan';
import type { ParsedBillingEvent } from './types';
import type { Plan } from '@levelup/db';

// Plan is a string enum — its values are the string literals themselves.
// We use it both as a type and as a runtime value set for validation.

// NOTE: Stripe SDK v17 changed the Invoice object — subscriptions are now
// referenced via `invoice.parent` (type 'subscription_details') rather than
// the legacy `invoice.subscription` field. We support both shapes so the code
// works whether the SDK exposes the legacy field (still present in v17 for
// backwards compat) or the caller passes an older-style object.

// ---------------------------------------------------------------------------
// Verify raw webhook payload
// ---------------------------------------------------------------------------

/**
 * Verifies a Stripe webhook signature and returns the parsed event.
 *
 * IMPORTANT: `rawBody` MUST be the raw request body as a Buffer or string —
 * do NOT JSON.parse it before calling this function; Stripe's signature
 * validation requires the exact bytes that were sent.
 *
 * Throws in stub mode (webhooks are not available without real Stripe keys).
 * Throws when the signature is invalid or the secret is not configured.
 */
export function verifyWebhook(rawBody: string | Buffer, signature: string): Stripe.Event {
  if (isStubMode()) {
    throw new Error(
      '[@levelup/billing] Webhooks not available in stub mode. ' +
        'Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to real values.',
    );
  }

  const secret = billingConfig.stripeWebhookSecret;
  if (!secret) {
    throw new Error(
      '[@levelup/billing] STRIPE_WEBHOOK_SECRET is not set. ' +
        'Configure it to verify webhook signatures.',
    );
  }

  const stripe = getStripe();
  // constructEvent expects the raw body bytes and the Stripe-Signature header.
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

// ---------------------------------------------------------------------------
// Helper: extract Plan from a subscription's items
// ---------------------------------------------------------------------------

function planFromSubscription(subscription: Stripe.Subscription): Plan | null {
  const firstItem = subscription.items.data[0];
  if (!firstItem) return null;
  const priceId = firstItem.price.id;
  return planFromPriceId(priceId);
}

// ---------------------------------------------------------------------------
// Parse a verified Stripe event into a typed discriminated union
// ---------------------------------------------------------------------------

/**
 * Maps a verified Stripe.Event into a typed ParsedBillingEvent.
 *
 * Handles the following Stripe events:
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - checkout.session.completed
 *   - invoice.payment_failed
 *
 * Any other event type (or one where the price ID is unrecognised) falls
 * through to `{ type: 'unknown', raw: event }`.
 */
export function parseEvent(event: Stripe.Event): ParsedBillingEvent {
  switch (event.type) {
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      const plan = planFromSubscription(subscription);
      if (!plan) return { type: 'unknown', raw: event };

      const organizationId = subscription.metadata?.['organizationId'];
      if (!organizationId) return { type: 'unknown', raw: event };

      return {
        type: 'subscription.created',
        organizationId,
        plan,
        subscriptionId: subscription.id,
        customerId:
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id,
      };
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const plan = planFromSubscription(subscription);
      if (!plan) return { type: 'unknown', raw: event };

      const organizationId = subscription.metadata?.['organizationId'];
      if (!organizationId) return { type: 'unknown', raw: event };

      return {
        type: 'subscription.updated',
        organizationId,
        plan,
        subscriptionId: subscription.id,
        status: subscription.status,
      };
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      const organizationId = subscription.metadata?.['organizationId'];
      if (!organizationId) return { type: 'unknown', raw: event };

      return {
        type: 'subscription.deleted',
        organizationId,
        subscriptionId: subscription.id,
      };
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      const organizationId = session.client_reference_id ?? session.metadata?.['organizationId'];
      if (!organizationId) return { type: 'unknown', raw: event };

      // Prefer metadata plan value (set explicitly at session creation) over
      // price lookup which requires the subscription to be expanded.
      const metaPlan = session.metadata?.['plan'] as Plan | undefined;
      const plan: Plan | null = metaPlan ?? null;
      if (!plan) return { type: 'unknown', raw: event };

      const customerId =
        typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
      if (!customerId) return { type: 'unknown', raw: event };

      return {
        type: 'checkout.completed',
        organizationId,
        plan,
        customerId,
      };
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;

      const organizationId = invoice.metadata?.['organizationId'];
      if (!organizationId) return { type: 'unknown', raw: event };

      // Stripe SDK v17 exposes subscription info via `invoice.parent` when
      // parent.type === 'subscription_details'. The older `invoice.subscription`
      // field is still present in the API response for backwards compatibility.
      const parent = (
        invoice as unknown as {
          parent?: { type: string; subscription_details?: { subscription: string } };
        }
      ).parent;
      let subscriptionId: string | null = null;

      if (parent?.type === 'subscription_details' && parent.subscription_details?.subscription) {
        subscriptionId = parent.subscription_details.subscription;
      } else {
        // Fallback: legacy field (string | Stripe.Subscription | null)
        const legacySub = (invoice as unknown as { subscription?: string | { id: string } | null })
          .subscription;
        if (typeof legacySub === 'string') {
          subscriptionId = legacySub;
        } else if (legacySub && typeof legacySub === 'object') {
          subscriptionId = legacySub.id;
        }
      }

      if (!subscriptionId) return { type: 'unknown', raw: event };

      return {
        type: 'invoice.payment_failed',
        organizationId,
        subscriptionId,
      };
    }

    default:
      return { type: 'unknown', raw: event };
  }
}
