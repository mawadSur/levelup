import { Plan } from '@levelup/db';
import { priceToPlan, planToPrice } from './config';

// ---------------------------------------------------------------------------
// Seat caps
// ---------------------------------------------------------------------------

const SEAT_CAPS: Record<Plan, number> = {
  [Plan.STARTER]: 50,
  [Plan.GROWTH]: 250,
  // ENTERPRISE default cap — the API layer may override this for custom contracts.
  [Plan.ENTERPRISE]: 5000,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a Stripe price ID to the corresponding Plan.
 * Returns null if the price ID is not recognised (e.g. not yet configured).
 */
export function planFromPriceId(priceId: string): Plan | null {
  return priceToPlan.get(priceId) ?? null;
}

/**
 * Return the default seat cap for a plan.
 * ENTERPRISE defaults to 5000; the API may override per-org.
 */
export function planSeatsFor(plan: Plan): number {
  return SEAT_CAPS[plan];
}

/**
 * Returns true when currentUserCount is within the seat limit for the plan.
 */
export function isWithinSeatLimit(plan: Plan, currentUserCount: number): boolean {
  return currentUserCount <= SEAT_CAPS[plan];
}

/**
 * Return the Stripe price ID configured for this plan, or null if not set.
 */
export function priceFor(plan: Plan): string | null {
  return planToPrice.get(plan) ?? null;
}
