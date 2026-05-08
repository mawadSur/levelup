/**
 * @levelup/billing — plan + per-seat pricing helpers
 *
 * The billing config reads from env at module load time. We set the env vars
 * here BEFORE importing the module so the price→plan maps are seeded with
 * test values.
 *
 * Run: pnpm --filter @levelup/billing test
 */

import { describe, it, expect, vi } from 'vitest';

// Hoist env setup so it runs BEFORE the ESM imports below resolve.
vi.hoisted(() => {
  process.env['STRIPE_SECRET_KEY'] = 'PLACEHOLDER_test';
  process.env['STRIPE_WEBHOOK_SECRET'] = 'PLACEHOLDER_webhook';
  // Per-seat pricing env vars
  process.env['STRIPE_PRICE_STARTER_MONTHLY'] = 'price_starter_monthly';
  process.env['STRIPE_PRICE_STARTER_ANNUAL'] = 'price_starter_annual';
  process.env['STRIPE_PRICE_TEAM_MONTHLY'] = 'price_team_monthly';
  process.env['STRIPE_PRICE_TEAM_ANNUAL'] = 'price_team_annual';
  process.env['STRIPE_PRICE_GROWTH_MONTHLY'] = 'price_growth_monthly';
  process.env['STRIPE_PRICE_GROWTH_ANNUAL'] = 'price_growth_annual';
  process.env['NODE_ENV'] = 'test';
});

import {
  PLAN_CONFIG,
  getPlanLimit,
  isPerSeat,
  requiresSales,
  getMonthlyPrice,
  getCyclePrice,
  planFromPriceId,
  planAndIntervalFromPriceId,
  planSeatsFor,
  isWithinSeatLimit,
  priceFor,
} from './plan';
import { getStripePriceId } from './config';
import { Plan, BillingInterval } from '@levelup/db';

// ============================================================================
// PLAN_CONFIG shape
// ============================================================================
describe('PLAN_CONFIG', () => {
  it('exposes all five tiers', () => {
    expect(Object.keys(PLAN_CONFIG)).toEqual(
      expect.arrayContaining([Plan.TRIAL, Plan.STARTER, Plan.TEAM, Plan.GROWTH, Plan.ENTERPRISE]),
    );
  });

  it('marks TRIAL and STARTER as flat-rate', () => {
    expect(PLAN_CONFIG[Plan.TRIAL].perSeat).toBe(false);
    expect(PLAN_CONFIG[Plan.STARTER].perSeat).toBe(false);
  });

  it('marks TEAM, GROWTH, ENTERPRISE as per-seat', () => {
    expect(PLAN_CONFIG[Plan.TEAM].perSeat).toBe(true);
    expect(PLAN_CONFIG[Plan.GROWTH].perSeat).toBe(true);
    expect(PLAN_CONFIG[Plan.ENTERPRISE].perSeat).toBe(true);
  });
});

// ============================================================================
// getPlanLimit / isPerSeat / requiresSales
// ============================================================================
describe('getPlanLimit', () => {
  it('returns 10 for TRIAL', () => expect(getPlanLimit(Plan.TRIAL)).toBe(10));
  it('returns 25 for STARTER', () => expect(getPlanLimit(Plan.STARTER)).toBe(25));
  it('returns 100 for TEAM', () => expect(getPlanLimit(Plan.TEAM)).toBe(100));
  it('returns 500 for GROWTH', () => expect(getPlanLimit(Plan.GROWTH)).toBe(500));
  it('returns 5000 for ENTERPRISE', () => expect(getPlanLimit(Plan.ENTERPRISE)).toBe(5000));
});

describe('isPerSeat', () => {
  it('returns false for flat-rate tiers', () => {
    expect(isPerSeat(Plan.TRIAL)).toBe(false);
    expect(isPerSeat(Plan.STARTER)).toBe(false);
  });
  it('returns true for per-seat tiers', () => {
    expect(isPerSeat(Plan.TEAM)).toBe(true);
    expect(isPerSeat(Plan.GROWTH)).toBe(true);
    expect(isPerSeat(Plan.ENTERPRISE)).toBe(true);
  });
});

describe('requiresSales', () => {
  it('only ENTERPRISE requires sales', () => {
    expect(requiresSales(Plan.ENTERPRISE)).toBe(true);
    expect(requiresSales(Plan.GROWTH)).toBe(false);
    expect(requiresSales(Plan.TEAM)).toBe(false);
    expect(requiresSales(Plan.STARTER)).toBe(false);
    expect(requiresSales(Plan.TRIAL)).toBe(false);
  });
});

// ============================================================================
// getMonthlyPrice / getCyclePrice
// ============================================================================
describe('getMonthlyPrice', () => {
  it('returns 0 for TRIAL', () => {
    expect(getMonthlyPrice(Plan.TRIAL, BillingInterval.MONTHLY, 5)).toBe(0);
    expect(getMonthlyPrice(Plan.TRIAL, BillingInterval.ANNUAL, 5)).toBe(0);
  });

  it('returns flat $599/mo for STARTER monthly', () => {
    expect(getMonthlyPrice(Plan.STARTER, BillingInterval.MONTHLY, 25)).toBe(599);
  });

  it('returns 5990/12 for STARTER annual (monthly equivalent)', () => {
    expect(getMonthlyPrice(Plan.STARTER, BillingInterval.ANNUAL, 25)).toBeCloseTo(5990 / 12);
  });

  it('scales linearly per seat for TEAM monthly', () => {
    expect(getMonthlyPrice(Plan.TEAM, BillingInterval.MONTHLY, 50)).toBe(50 * 12);
  });

  it('scales linearly per seat for GROWTH annual', () => {
    expect(getMonthlyPrice(Plan.GROWTH, BillingInterval.ANNUAL, 200)).toBe(200 * 13);
  });

  it('clamps below minSeats to plan minimum', () => {
    // TEAM minimum is 25 — passing 10 should clamp to 25.
    expect(getMonthlyPrice(Plan.TEAM, BillingInterval.MONTHLY, 10)).toBe(25 * 12);
  });
});

describe('getCyclePrice', () => {
  it('returns the full annual amount for annual cycle', () => {
    expect(getCyclePrice(Plan.STARTER, BillingInterval.ANNUAL, 25)).toBe(5990);
  });

  it('returns annualPerSeat * seats * 12 for per-seat annual', () => {
    expect(getCyclePrice(Plan.TEAM, BillingInterval.ANNUAL, 50)).toBe(50 * 10 * 12);
  });
});

// ============================================================================
// planFromPriceId / planAndIntervalFromPriceId
// ============================================================================
describe('planFromPriceId', () => {
  it('maps the STARTER monthly price ID to Plan.STARTER', () => {
    expect(planFromPriceId('price_starter_monthly')).toBe(Plan.STARTER);
  });

  it('maps the GROWTH annual price ID to Plan.GROWTH', () => {
    expect(planFromPriceId('price_growth_annual')).toBe(Plan.GROWTH);
  });

  it('maps the TEAM monthly price ID to Plan.TEAM', () => {
    expect(planFromPriceId('price_team_monthly')).toBe(Plan.TEAM);
  });

  it('returns null for an unknown price ID', () => {
    expect(planFromPriceId('price_unknown_xyz')).toBeNull();
  });
});

describe('planAndIntervalFromPriceId', () => {
  it('detects MONTHLY interval from monthly price IDs', () => {
    expect(planAndIntervalFromPriceId('price_team_monthly')).toEqual({
      plan: Plan.TEAM,
      interval: BillingInterval.MONTHLY,
    });
  });

  it('detects ANNUAL interval from annual price IDs', () => {
    expect(planAndIntervalFromPriceId('price_growth_annual')).toEqual({
      plan: Plan.GROWTH,
      interval: BillingInterval.ANNUAL,
    });
  });

  it('returns null for an unknown price ID', () => {
    expect(planAndIntervalFromPriceId('price_unknown')).toBeNull();
  });
});

// ============================================================================
// getStripePriceId
// ============================================================================
describe('getStripePriceId', () => {
  it('returns monthly price for STARTER monthly', () => {
    expect(getStripePriceId(Plan.STARTER, BillingInterval.MONTHLY)).toBe('price_starter_monthly');
  });

  it('returns annual price for TEAM annual', () => {
    expect(getStripePriceId(Plan.TEAM, BillingInterval.ANNUAL)).toBe('price_team_annual');
  });

  it('returns null for TRIAL (never goes through Checkout)', () => {
    expect(getStripePriceId(Plan.TRIAL, BillingInterval.MONTHLY)).toBeNull();
  });

  it('returns null for ENTERPRISE (sales-led)', () => {
    expect(getStripePriceId(Plan.ENTERPRISE, BillingInterval.MONTHLY)).toBeNull();
  });
});

// ============================================================================
// Legacy helpers (planSeatsFor / isWithinSeatLimit / priceFor)
// ============================================================================
describe('planSeatsFor (legacy)', () => {
  it('mirrors getPlanLimit for new tiers', () => {
    expect(planSeatsFor(Plan.STARTER)).toBe(25);
    expect(planSeatsFor(Plan.GROWTH)).toBe(500);
    expect(planSeatsFor(Plan.ENTERPRISE)).toBe(5000);
  });
});

describe('isWithinSeatLimit', () => {
  it('STARTER at boundary (25) is within limit', () => {
    expect(isWithinSeatLimit(Plan.STARTER, 25)).toBe(true);
  });
  it('STARTER one above boundary is rejected', () => {
    expect(isWithinSeatLimit(Plan.STARTER, 26)).toBe(false);
  });
  it('TRIAL at boundary (10) is within limit', () => {
    expect(isWithinSeatLimit(Plan.TRIAL, 10)).toBe(true);
  });
});

describe('priceFor', () => {
  it('returns the STARTER monthly price ID by default', () => {
    expect(priceFor(Plan.STARTER)).toBe('price_starter_monthly');
  });

  it('returns the GROWTH monthly price ID by default', () => {
    expect(priceFor(Plan.GROWTH)).toBe('price_growth_monthly');
  });
});
