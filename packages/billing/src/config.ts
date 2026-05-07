import { Plan } from '@levelup/db';

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
  stripePriceStarter: string;
  stripePriceGrowth: string;
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
// Price → Plan map
// ---------------------------------------------------------------------------

function buildPriceToPlan(cfg: BillingConfig): Map<string, Plan> {
  const map = new Map<string, Plan>();
  if (cfg.stripePriceStarter) map.set(cfg.stripePriceStarter, Plan.STARTER);
  if (cfg.stripePriceGrowth) map.set(cfg.stripePriceGrowth, Plan.GROWTH);
  if (cfg.stripePriceEnterprise) map.set(cfg.stripePriceEnterprise, Plan.ENTERPRISE);
  return map;
}

export const priceToPlan: Map<string, Plan> = buildPriceToPlan(billingConfig);

// ---------------------------------------------------------------------------
// Plan → price ID lookup (inverse)
// ---------------------------------------------------------------------------

function buildPlanToPrice(cfg: BillingConfig): Map<Plan, string> {
  const map = new Map<Plan, string>();
  if (cfg.stripePriceStarter) map.set(Plan.STARTER, cfg.stripePriceStarter);
  if (cfg.stripePriceGrowth) map.set(Plan.GROWTH, cfg.stripePriceGrowth);
  if (cfg.stripePriceEnterprise) map.set(Plan.ENTERPRISE, cfg.stripePriceEnterprise);
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
