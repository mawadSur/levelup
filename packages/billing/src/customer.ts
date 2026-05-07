import { isStubMode } from './config';
import { getStripe } from './stripe';
import { stubEnsureCustomer } from './stub';
import type { EnsureCustomerInput, EnsureCustomerResult } from './types';

// ---------------------------------------------------------------------------
// Customer management
// ---------------------------------------------------------------------------

/**
 * Resolves or creates a Stripe customer for an organisation.
 *
 * In stub mode: returns a deterministic fake customer ID without any
 * network calls.
 *
 * In real mode: returns the existing customer when `existingCustomerId`
 * is provided; otherwise creates a new Stripe customer tagged with
 * `metadata.organizationId`.
 */
export async function ensureCustomer(input: EnsureCustomerInput): Promise<EnsureCustomerResult> {
  const { organizationId, email, name, existingCustomerId } = input;

  if (isStubMode()) {
    return stubEnsureCustomer(organizationId, existingCustomerId);
  }

  const stripe = getStripe();

  if (existingCustomerId) {
    return { customerId: existingCustomerId, created: false };
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { organizationId },
  });

  return { customerId: customer.id, created: true };
}
