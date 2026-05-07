import Stripe from 'stripe';
import { billingConfig, isStubMode } from './config';

// ---------------------------------------------------------------------------
// Lazy singleton Stripe client
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;

/**
 * Returns the singleton Stripe client.
 * Throws if called in stub mode — callers must guard with isStubMode() first.
 */
export function getStripe(): Stripe {
  if (isStubMode()) {
    throw new Error(
      '[@levelup/billing] Cannot create a real Stripe client in stub mode. ' +
        'Set STRIPE_SECRET_KEY to a real key (without PLACEHOLDER_ prefix).',
    );
  }

  if (!_stripe) {
    _stripe = new Stripe(billingConfig.stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  return _stripe;
}
