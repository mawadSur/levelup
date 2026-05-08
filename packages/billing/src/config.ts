import { Plan, BillingInterval } from '@levelup/db';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLACEHOLDER_PREFIX = 'PLACEHOLDER_';

// ---------------------------------------------------------------------------
// Billing config shape
// ---------------------------------------------------------------------------

export interface BillingConfig {
  stripeSecretKey: string;
  stripeWebhookSecret: string;

  // Per-seat pricing: monthly and annual price IDs per tier.
  stripePriceStarterMonthly: string;
  stripePriceStarterAnnual: string;
  stripePriceTeamMonthly: string;
  stripePriceTeamAnnual: string;
  stripePriceGrowthMonthly: string;
  stripePriceGrowthAnnual: string;

  // Legacy single-price-per-plan vars. Kept so existing local .env files
  // bootstrapped before the per-seat migration still resolve a Plan from a
  // price id; callers should prefer the *_MONTHLY / *_ANNUAL vars.
  /** @deprecated use STRIPE_PRICE_STARTER_MONTHLY */
  stripePriceStarter: string;
  /** @deprecated use STRIPE_PRICE_GROWTH_MONTHLY */
  stripePriceGrowth: string;
  /** @deprecated ENTERPRISE no longer self-serve; sales-led only */
  stripePriceEnterprise: string;

  appUrl: string;
  nodeEnv: string;
}

// ---------------------------------------------------------------------------
// Read environment
// ---------------------------------------------------------------------------

function readEnv(): BillingConfig {
  return {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    stripePriceStarterMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
    stripePriceStarterAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? '',
    stripePriceTeamMonthly: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? '',
    stripePriceTeamAnnual: process.env.STRIPE_PRICE_TEAM_ANNUAL ?? '',
    stripePriceGrowthMonthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY ?? '',
    stripePriceGrowthAnnual: process.env.STRIPE_PRICE_GROWTH_ANNUAL ?? '',
    stripePriceStarter: process.env.STRIPE_PRICE_STARTER ?? '',
    stripePriceGrowth: process.env.STRIPE_PRICE_GROWTH ?? '',
    stripePriceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };
}

export const billingConfig: BillingConfig = readEnv();

// ---------------------------------------------------------------------------
// Stub mode
// ---------------------------------------------------------------------------

export function isStubMode(): boolean {
  const key = billingConfig.stripeSecretKey;
  if (!key || key.length === 0) return true;
  return key.startsWith(PLACEHOLDER_PREFIX);
}

// ---------------------------------------------------------------------------
// (Plan, Interval) → Stripe price ID
// ---------------------------------------------------------------------------

/**
 * Resolve the Stripe price ID for a (plan, interval) pair. Returns null when
 * the corresponding env var is unset (stub mode or sales-led tier without a
 * self-serve price).
 *
 * ENTERPRISE never returns a price ID — it's sales-led; the API must short
 * circuit to a sales-contact response before reaching here.
 *
 * TRIAL never returns a price ID — trials don't go through Stripe Checkout;
 * the API initialises trial state directly when the org signs up.
 */
export function getStripePriceId(plan: Plan, interval: BillingInterval): string | null {
  const cfg = billingConfig;
  if (plan === Plan.STARTER) {
    return interval === BillingInterval.ANNUAL
      ? cfg.stripePriceStarterAnnual || cfg.stripePriceStarter || null
      : cfg.stripePriceStarterMonthly || cfg.stripePriceStarter || null;
  }
  if (plan === Plan.TEAM) {
    return interval === BillingInterval.ANNUAL
      ? cfg.stripePriceTeamAnnual || null
      : cfg.stripePriceTeamMonthly || null;
  }
  if (plan === Plan.GROWTH) {
    return interval === BillingInterval.ANNUAL
      ? cfg.stripePriceGrowthAnnual || cfg.stripePriceGrowth || null
      : cfg.stripePriceGrowthMonthly || cfg.stripePriceGrowth || null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Price → Plan map (legacy compatibility)
// ---------------------------------------------------------------------------
//
// Kept so callers that resolve only by price ID (without an interval hint)
// continue to work. The webhook handler should prefer planAndIntervalFromPriceId.

function buildPriceToPlan(cfg: BillingConfig): Map<string, Plan> {
  const map = new Map<string, Plan>();
  // Per-seat (monthly + annual)
  if (cfg.stripePriceStarterMonthly) map.set(cfg.stripePriceStarterMonthly, Plan.STARTER);
  if (cfg.stripePriceStarterAnnual) map.set(cfg.stripePriceStarterAnnual, Plan.STARTER);
  if (cfg.stripePriceTeamMonthly) map.set(cfg.stripePriceTeamMonthly, Plan.TEAM);
  if (cfg.stripePriceTeamAnnual) map.set(cfg.stripePriceTeamAnnual, Plan.TEAM);
  if (cfg.stripePriceGrowthMonthly) map.set(cfg.stripePriceGrowthMonthly, Plan.GROWTH);
  if (cfg.stripePriceGrowthAnnual) map.set(cfg.stripePriceGrowthAnnual, Plan.GROWTH);
  // Legacy single-price vars (pre-migration installs)
  if (cfg.stripePriceStarter) map.set(cfg.stripePriceStarter, Plan.STARTER);
  if (cfg.stripePriceGrowth) map.set(cfg.stripePriceGrowth, Plan.GROWTH);
  if (cfg.stripePriceEnterprise) map.set(cfg.stripePriceEnterprise, Plan.ENTERPRISE);
  return map;
}

export const priceToPlan: Map<string, Plan> = buildPriceToPlan(billingConfig);

// ---------------------------------------------------------------------------
// Plan → price ID lookup (inverse, monthly-default for backward compat)
// ---------------------------------------------------------------------------

function buildPlanToPrice(cfg: BillingConfig): Map<Plan, string> {
  const map = new Map<Plan, string>();
  const starter = cfg.stripePriceStarterMonthly || cfg.stripePriceStarter;
  const team = cfg.stripePriceTeamMonthly;
  const growth = cfg.stripePriceGrowthMonthly || cfg.stripePriceGrowth;
  const enterprise = cfg.stripePriceEnterprise;
  if (starter) map.set(Plan.STARTER, starter);
  if (team) map.set(Plan.TEAM, team);
  if (growth) map.set(Plan.GROWTH, growth);
  if (enterprise) map.set(Plan.ENTERPRISE, enterprise);
  return map;
}

export const planToPrice: Map<Plan, string> = buildPlanToPrice(billingConfig);

// ---------------------------------------------------------------------------
// Enforce stub mode policy at module load
// ---------------------------------------------------------------------------

let _stubWarned = false;

(function enforceStubModePolicy(): void {
  if (!isStubMode()) return;

  if (billingConfig.nodeEnv === 'production') {
    throw new Error(
      '[@levelup/billing] STRIPE_SECRET_KEY is missing or a PLACEHOLDER_ value in production. ' +
        'Set a real Stripe secret key.',
    );
  }

  if (!_stubWarned) {
    _stubWarned = true;

    console.warn(
      '[billing] STUB MODE — set STRIPE_SECRET_KEY (without PLACEHOLDER_ prefix) for real Stripe integration.',
    );
  }
})();
