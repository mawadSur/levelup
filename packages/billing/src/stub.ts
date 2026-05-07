import type { Plan } from '@levelup/db';
import { billingConfig } from './config';
import type {
  CheckoutSessionResult,
  BillingPortalSessionResult,
  EnsureCustomerResult,
} from './types';

// ---------------------------------------------------------------------------
// One-time stub-mode warning (printed by config.ts at module load already,
// but kept here as a guard for direct stub usage).
// ---------------------------------------------------------------------------

let _warned = false;

export function warnStubOnce(): void {
  if (_warned) return;
  _warned = true;

  console.warn(
    '[billing] STUB MODE — all Stripe calls are returning deterministic fake responses. ' +
      'Set STRIPE_SECRET_KEY to a real key for production.',
  );
}

// ---------------------------------------------------------------------------
// Stub checkout session
// ---------------------------------------------------------------------------

export function stubCheckoutSession(organizationId: string, plan: Plan): CheckoutSessionResult {
  warnStubOnce();
  const url = `${billingConfig.appUrl}/billing/stub-success?org=${organizationId}&plan=${plan}`;
  return {
    url,
    sessionId: `cs_stub_${organizationId}_${plan.toLowerCase()}`,
  };
}

// ---------------------------------------------------------------------------
// Stub billing portal
// ---------------------------------------------------------------------------

export function stubBillingPortalSession(): BillingPortalSessionResult {
  warnStubOnce();
  return {
    url: `${billingConfig.appUrl}/billing/stub-portal`,
  };
}

// ---------------------------------------------------------------------------
// Stub customer
// ---------------------------------------------------------------------------

export function stubEnsureCustomer(
  organizationId: string,
  existingCustomerId?: string | null,
): EnsureCustomerResult {
  warnStubOnce();
  return {
    customerId: `cus_stub_${organizationId}`,
    created: !existingCustomerId,
  };
}
