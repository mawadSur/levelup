/**
 * @levelup/billing — planFromPriceId / planSeatsFor / isWithinSeatLimit / priceFor tests
 *
 * The billing config reads from env at module load time via `buildPriceToPlan`.
 * We set the env vars here BEFORE importing the module so the maps are seeded
 * with test values. We then import plan helpers and the config maps directly
 * from source to test in isolation.
 *
 * Run: pnpm --filter @levelup/billing test
 */

import { describe, it, expect, vi } from 'vitest';

// Hoist env setup so it runs BEFORE the ESM imports below resolve.
// Without `vi.hoisted`, ESM evaluates the imports below before any top-level
// statements in this file, leaving the price→plan map empty.
vi.hoisted(() => {
  process.env['STRIPE_SECRET_KEY'] = 'PLACEHOLDER_test';
  process.env['STRIPE_WEBHOOK_SECRET'] = 'PLACEHOLDER_webhook';
  process.env['STRIPE_PRICE_STARTER'] = 'price_test_starter';
  process.env['STRIPE_PRICE_GROWTH'] = 'price_test_growth';
  process.env['STRIPE_PRICE_ENTERPRISE'] = 'price_test_enterprise';
  process.env['NODE_ENV'] = 'test';
});

// Import Plan enum value directly — avoids pulling in Prisma client binary
// by using the numeric enum representation from the compiled package. Because
// vitest can resolve .ts source we import the Plan type from config which
// re-exports from @levelup/db.
import { planFromPriceId, planSeatsFor, isWithinSeatLimit, priceFor } from './plan';
import { Plan } from '@levelup/db';

// ============================================================================
// planFromPriceId
// ============================================================================
describe('planFromPriceId', () => {
  it('maps the STARTER price ID to Plan.STARTER', () => {
    expect(planFromPriceId('price_test_starter')).toBe(Plan.STARTER);
  });

  it('maps the GROWTH price ID to Plan.GROWTH', () => {
    expect(planFromPriceId('price_test_growth')).toBe(Plan.GROWTH);
  });

  it('maps the ENTERPRISE price ID to Plan.ENTERPRISE', () => {
    expect(planFromPriceId('price_test_enterprise')).toBe(Plan.ENTERPRISE);
  });

  it('returns null for an unknown price ID', () => {
    expect(planFromPriceId('price_unknown_xyz')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(planFromPriceId('')).toBeNull();
  });
});

// ============================================================================
// planSeatsFor
// ============================================================================
describe('planSeatsFor', () => {
  it('returns 50 for STARTER', () => {
    expect(planSeatsFor(Plan.STARTER)).toBe(50);
  });

  it('returns 250 for GROWTH', () => {
    expect(planSeatsFor(Plan.GROWTH)).toBe(250);
  });

  it('returns 5000 for ENTERPRISE', () => {
    expect(planSeatsFor(Plan.ENTERPRISE)).toBe(5000);
  });
});

// ============================================================================
// isWithinSeatLimit
// ============================================================================
describe('isWithinSeatLimit', () => {
  describe('STARTER (cap = 50)', () => {
    it('returns true when count is 0', () => {
      expect(isWithinSeatLimit(Plan.STARTER, 0)).toBe(true);
    });

    it('returns true when count equals the cap (50)', () => {
      expect(isWithinSeatLimit(Plan.STARTER, 50)).toBe(true);
    });

    it('returns false when count exceeds the cap (51)', () => {
      expect(isWithinSeatLimit(Plan.STARTER, 51)).toBe(false);
    });
  });

  describe('GROWTH (cap = 250)', () => {
    it('returns true at the boundary (250)', () => {
      expect(isWithinSeatLimit(Plan.GROWTH, 250)).toBe(true);
    });

    it('returns false one above boundary (251)', () => {
      expect(isWithinSeatLimit(Plan.GROWTH, 251)).toBe(false);
    });
  });

  describe('ENTERPRISE (cap = 5000)', () => {
    it('returns true at the boundary (5000)', () => {
      expect(isWithinSeatLimit(Plan.ENTERPRISE, 5000)).toBe(true);
    });

    it('returns false one above boundary (5001)', () => {
      expect(isWithinSeatLimit(Plan.ENTERPRISE, 5001)).toBe(false);
    });
  });
});

// ============================================================================
// priceFor
// ============================================================================
describe('priceFor', () => {
  it('returns the STARTER price ID', () => {
    expect(priceFor(Plan.STARTER)).toBe('price_test_starter');
  });

  it('returns the GROWTH price ID', () => {
    expect(priceFor(Plan.GROWTH)).toBe('price_test_growth');
  });

  it('returns the ENTERPRISE price ID', () => {
    expect(priceFor(Plan.ENTERPRISE)).toBe('price_test_enterprise');
  });
});
