import { Plan, BillingInterval } from '@levelup/db';
import { priceToPlan, planToPrice, getStripePriceId } from './config';

// ---------------------------------------------------------------------------
// Per-tier pricing config
// ---------------------------------------------------------------------------
//
// PLAN_CONFIG is the single source of truth for tier limits and prices in
// the per-seat model. Tiers split into two shapes:
//
//   - Flat-rate (TRIAL, STARTER): fixed monthly/annual price irrespective of
//     seat count, capped at `maxSeats`.
//   - Per-seat (TEAM, GROWTH, ENTERPRISE): price scales linearly with seat
//     count. The page enforces `minSeats..maxSeats` on the input.
//
// Annual prices are the *yearly* dollar amount, not /12. UI multiplies
// `annualPerSeatUsd × seats` to display the contracted yearly total.

export interface FlatPlanConfig {
  perSeat: false;
  salesLed: false;
  maxSeats: number;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  /** Trial-specific: number of days before trial expires. */
  days?: number;
  includes?: readonly string[];
}

export interface PerSeatPlanConfig {
  perSeat: true;
  salesLed: boolean;
  minSeats: number;
  maxSeats: number;
  monthlyPerSeatUsd: number;
  annualPerSeatUsd: number;
  /** Anchor annual price for sales-led tiers — shown on pricing as "from $N/yr". */
  anchorAnnualUsd?: number;
  includes?: readonly string[];
}

export type PlanConfig = FlatPlanConfig | PerSeatPlanConfig;

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  [Plan.TRIAL]: {
    perSeat: false,
    salesLed: false,
    maxSeats: 10,
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    days: 14,
  },
  [Plan.STARTER]: {
    perSeat: false,
    salesLed: false,
    maxSeats: 25,
    monthlyPriceUsd: 599,
    annualPriceUsd: 5990,
  },
  [Plan.TEAM]: {
    perSeat: true,
    salesLed: false,
    minSeats: 25,
    maxSeats: 100,
    monthlyPerSeatUsd: 12,
    annualPerSeatUsd: 10,
  },
  [Plan.GROWTH]: {
    perSeat: true,
    salesLed: false,
    minSeats: 100,
    maxSeats: 500,
    monthlyPerSeatUsd: 15,
    annualPerSeatUsd: 13,
    includes: ['SSO', 'CUSTOM_PATHS'],
  },
  [Plan.ENTERPRISE]: {
    perSeat: true,
    salesLed: true,
    minSeats: 500,
    maxSeats: 5000,
    monthlyPerSeatUsd: 25,
    annualPerSeatUsd: 21,
    anchorAnnualUsd: 25_000,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLAN_CONFIG[plan];
}

/**
 * Maximum seats permitted on this plan. Used by the seat-enforcement guard.
 */
export function getPlanLimit(plan: Plan): number {
  return PLAN_CONFIG[plan].maxSeats;
}

/** True for tiers billed per-seat (TEAM, GROWTH, ENTERPRISE). */
export function isPerSeat(plan: Plan): boolean {
  return PLAN_CONFIG[plan].perSeat;
}

/** True for tiers gated behind a sales conversation (ENTERPRISE). */
export function requiresSales(plan: Plan): boolean {
  const cfg = PLAN_CONFIG[plan];
  return cfg.perSeat && cfg.salesLed;
}

/**
 * Compute the *monthly* dollar amount this plan costs at the given seat count
 * and billing interval. For annual interval the per-seat or flat annual price
 * is returned divided by 12 so callers can render "monthly equivalent" totals.
 *
 * Returns 0 for TRIAL and the anchor price for ENTERPRISE when seats < min.
 */
export function getMonthlyPrice(plan: Plan, interval: BillingInterval, seats: number): number {
  const cfg = PLAN_CONFIG[plan];

  if (!cfg.perSeat) {
    if (interval === 'ANNUAL') return cfg.annualPriceUsd / 12;
    return cfg.monthlyPriceUsd;
  }

  const clampedSeats = Math.max(cfg.minSeats, Math.min(cfg.maxSeats, seats));
  if (interval === 'ANNUAL') return cfg.annualPerSeatUsd * clampedSeats;
  return cfg.monthlyPerSeatUsd * clampedSeats;
}

/**
 * Compute the *total* dollar amount on this billing cycle. Annual returns the
 * full yearly contracted amount; monthly returns the monthly bill.
 */
export function getCyclePrice(plan: Plan, interval: BillingInterval, seats: number): number {
  const cfg = PLAN_CONFIG[plan];

  if (!cfg.perSeat) {
    return interval === 'ANNUAL' ? cfg.annualPriceUsd : cfg.monthlyPriceUsd;
  }

  const clampedSeats = Math.max(cfg.minSeats, Math.min(cfg.maxSeats, seats));
  if (interval === 'ANNUAL') return cfg.annualPerSeatUsd * clampedSeats * 12;
  return cfg.monthlyPerSeatUsd * clampedSeats;
}

// ---------------------------------------------------------------------------
// Legacy helpers — kept so existing call sites compile without churn.
// New code should reach for getPlanLimit / PLAN_CONFIG directly.
// ---------------------------------------------------------------------------

/**
 * Resolve a Stripe price ID to the corresponding Plan.
 * Returns null if the price ID is not recognised (e.g. not yet configured).
 */
export function planFromPriceId(priceId: string): Plan | null {
  return priceToPlan.get(priceId) ?? null;
}

/**
 * Resolve a Stripe price ID to the (Plan, BillingInterval) pair it represents.
 * Used by webhook handlers to detect tier *and* billing-cycle changes.
 */
export function planAndIntervalFromPriceId(
  priceId: string,
): { plan: Plan; interval: BillingInterval } | null {
  // Search all plan/interval combinations until one matches.
  for (const plan of Object.values(Plan)) {
    for (const interval of Object.values(BillingInterval)) {
      const id = getStripePriceId(plan, interval);
      if (id && id === priceId) return { plan, interval };
    }
  }
  // Fallback to legacy lookup (single-price-per-plan configs).
  const legacyPlan = priceToPlan.get(priceId);
  if (legacyPlan) return { plan: legacyPlan, interval: BillingInterval.MONTHLY };
  return null;
}

/**
 * Return the seat cap for a plan.
 */
export function planSeatsFor(plan: Plan): number {
  return PLAN_CONFIG[plan].maxSeats;
}

/**
 * Returns true when currentUserCount is within the seat limit for the plan.
 */
export function isWithinSeatLimit(plan: Plan, currentUserCount: number): boolean {
  return currentUserCount <= PLAN_CONFIG[plan].maxSeats;
}

/**
 * Return the Stripe price ID configured for this plan, or null if not set.
 *
 * @deprecated Prefer `getStripePriceId(plan, interval)` — single-price-per-plan
 * mappings only resolve the legacy STRIPE_PRICE_<TIER> env vars (monthly).
 */
export function priceFor(plan: Plan): string | null {
  return planToPrice.get(plan) ?? null;
}
