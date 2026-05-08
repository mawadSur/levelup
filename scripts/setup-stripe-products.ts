#!/usr/bin/env tsx
/**
 * Stripe products + prices provisioning script for LevelUp AI Academy.
 *
 * Run this AFTER the pricing migration is fully landed and the STRIPE_PRICE_*
 * env vars are referenced in `packages/billing`. This script only provisions
 * Stripe — wiring code lives in the billing package.
 *
 * Usage:
 *   pnpm exec tsx scripts/setup-stripe-products.ts            # test mode (default)
 *   pnpm exec tsx scripts/setup-stripe-products.ts --live     # live mode
 *   pnpm exec tsx scripts/setup-stripe-products.ts --help
 *
 * Idempotent: products are looked up by metadata.levelup_tier; missing prices
 * are created on subsequent runs. A sidecar `.stripe-products.json` is written
 * at the repo root for re-runs and inspection.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Stripe from 'stripe';

type Tier = 'starter' | 'team' | 'growth';
type Interval = 'monthly' | 'annual';

interface PriceSpec {
  tier: Tier;
  interval: Interval;
  unitAmount: number; // cents
  recurring: 'month' | 'year';
  perSeat: boolean;
  envVar: string;
  nickname: string;
}

interface ProductSpec {
  tier: Tier;
  productKey: string; // stable lookup key for metadata
  name: string;
  description: string;
  prices: PriceSpec[];
}

const VERSION = '2026-05';

const PRODUCTS: ProductSpec[] = [
  {
    tier: 'starter',
    productKey: 'levelup-starter',
    name: 'LevelUp Starter — up to 25 seats',
    description: 'Flat $599/mo. Up to 25 seats. Core curriculum, AI coach, baseline reporting.',
    prices: [
      {
        tier: 'starter',
        interval: 'monthly',
        unitAmount: 59900,
        recurring: 'month',
        perSeat: false,
        envVar: 'STRIPE_PRICE_STARTER_MONTHLY',
        nickname: 'Starter — flat $599/mo (up to 25 seats)',
      },
    ],
  },
  {
    tier: 'team',
    productKey: 'levelup-team',
    name: 'LevelUp Team — per-seat (25–100)',
    description:
      'Per-seat pricing. 25–100 seats. Custom learning paths, manager dashboards, full audit log.',
    prices: [
      {
        tier: 'team',
        interval: 'monthly',
        unitAmount: 1200,
        recurring: 'month',
        perSeat: true,
        envVar: 'STRIPE_PRICE_TEAM_MONTHLY',
        nickname: 'Team — $12/seat/mo',
      },
      {
        tier: 'team',
        interval: 'annual',
        unitAmount: 12000,
        recurring: 'year',
        perSeat: true,
        envVar: 'STRIPE_PRICE_TEAM_ANNUAL',
        nickname: 'Team — $120/seat/yr ($10/seat/mo)',
      },
    ],
  },
  {
    tier: 'growth',
    productKey: 'levelup-growth',
    name: 'LevelUp Growth — per-seat (100–500), includes SSO + custom paths',
    description:
      'Per-seat pricing. 100–500 seats. SSO/SCIM, custom paths, advanced analytics, priority support.',
    prices: [
      {
        tier: 'growth',
        interval: 'monthly',
        unitAmount: 1500,
        recurring: 'month',
        perSeat: true,
        envVar: 'STRIPE_PRICE_GROWTH_MONTHLY',
        nickname: 'Growth — $15/seat/mo',
      },
      {
        tier: 'growth',
        interval: 'annual',
        unitAmount: 15600,
        recurring: 'year',
        perSeat: true,
        envVar: 'STRIPE_PRICE_GROWTH_ANNUAL',
        nickname: 'Growth — $156/seat/yr ($13/seat/mo)',
      },
    ],
  },
];

const HELP = `
LevelUp Stripe products + prices setup
======================================

Provisions the LevelUp tier products (Starter / Team / Growth) and their prices
in Stripe. Idempotent — re-runs reuse existing products and only create missing
prices. Tags every object with metadata.levelup_tier / levelup_interval so the
script (or you, in the dashboard) can identify them later.

USAGE
  pnpm exec tsx scripts/setup-stripe-products.ts             # test mode (default)
  pnpm exec tsx scripts/setup-stripe-products.ts --live      # live mode
  pnpm exec tsx scripts/setup-stripe-products.ts --help      # this message

ENV
  STRIPE_SECRET_KEY    required. sk_test_... for test mode, sk_live_... for live.
                       Refuses to run on PLACEHOLDER_* values.

OUTPUT
  - stdout: KEY=value lines for STRIPE_PRICE_*_MONTHLY / _ANNUAL env vars
  - .stripe-products.json (gitignored) at repo root with full Stripe objects

PRICING
  Starter   $599/mo flat                (up to 25 seats — no annual)
  Team      $12/seat/mo  /  $120/seat/yr  (25-100 seats, per-seat)
  Growth    $15/seat/mo  /  $156/seat/yr  (100-500 seats, per-seat)
  Trial     14 days, 10 seats, no Stripe price
  Enterprise sales-led, no Stripe price

VERIFY AFTER RUN
  https://dashboard.stripe.com/test/products  (test mode)
  https://dashboard.stripe.com/products       (live mode)
`;

function parseArgs(argv: string[]): { live: boolean; help: boolean } {
  return {
    live: argv.includes('--live'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function fail(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function tagMetadata(tier: Tier, interval?: Interval): Record<string, string> {
  const meta: Record<string, string> = {
    levelup_tier: tier,
    levelup_version: VERSION,
  };
  if (interval) meta.levelup_interval = interval;
  return meta;
}

async function findProductByTier(stripe: Stripe, tier: Tier): Promise<Stripe.Product | null> {
  // Stripe doesn't index metadata for general product lookup, so we paginate
  // active products. With three tiers, the workspace is tiny — this is fine.
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.metadata?.levelup_tier === tier) return product;
  }
  return null;
}

async function findPrice(
  stripe: Stripe,
  productId: string,
  tier: Tier,
  interval: Interval,
): Promise<Stripe.Price | null> {
  for await (const price of stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  })) {
    if (price.metadata?.levelup_tier === tier && price.metadata?.levelup_interval === interval) {
      return price;
    }
  }
  return null;
}

async function ensureProduct(
  stripe: Stripe,
  spec: ProductSpec,
): Promise<{ product: Stripe.Product; created: boolean }> {
  const existing = await findProductByTier(stripe, spec.tier);
  if (existing) {
    console.error(`  reuse product ${spec.productKey} -> ${existing.id}`);
    return { product: existing, created: false };
  }
  const product = await stripe.products.create({
    name: spec.name,
    description: spec.description,
    metadata: tagMetadata(spec.tier),
  });
  console.error(`  create product ${spec.productKey} -> ${product.id}`);
  return { product, created: true };
}

async function ensurePrice(
  stripe: Stripe,
  productId: string,
  priceSpec: PriceSpec,
): Promise<{ price: Stripe.Price; created: boolean }> {
  const existing = await findPrice(stripe, productId, priceSpec.tier, priceSpec.interval);
  if (existing) {
    console.error(`    reuse price  ${priceSpec.envVar} -> ${existing.id}`);
    return { price: existing, created: false };
  }
  const price = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: priceSpec.unitAmount,
    recurring: { interval: priceSpec.recurring },
    nickname: priceSpec.nickname,
    billing_scheme: 'per_unit',
    metadata: tagMetadata(priceSpec.tier, priceSpec.interval),
  });
  console.error(`    create price ${priceSpec.envVar} -> ${price.id}`);
  return { price, created: true };
}

interface SidecarShape {
  generatedAt: string;
  mode: 'test' | 'live';
  version: string;
  products: Array<{
    tier: Tier;
    productId: string;
    productKey: string;
    name: string;
    prices: Array<{
      envVar: string;
      priceId: string;
      tier: Tier;
      interval: Interval;
      unitAmount: number;
      recurring: 'month' | 'year';
      perSeat: boolean;
    }>;
  }>;
  raw: {
    products: Stripe.Product[];
    prices: Stripe.Price[];
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) fail('STRIPE_SECRET_KEY is not set in env. Refusing to run.');
  if (key.startsWith('PLACEHOLDER_'))
    fail(
      'STRIPE_SECRET_KEY is a PLACEHOLDER. Paste a real sk_test_... or sk_live_... value first.',
    );

  const isLiveKey = key.startsWith('sk_live_');
  const isTestKey = key.startsWith('sk_test_');
  if (!isLiveKey && !isTestKey)
    fail(
      `STRIPE_SECRET_KEY does not look like a Stripe secret key (expected sk_test_... or sk_live_...). Got: ${key.slice(0, 8)}...`,
    );
  if (args.live && !isLiveKey)
    fail(
      '--live flag was passed but STRIPE_SECRET_KEY is a test-mode key. Either drop --live or paste a sk_live_... key.',
    );
  if (!args.live && isLiveKey)
    fail(
      'STRIPE_SECRET_KEY is a LIVE key but --live flag was not passed. Pass --live explicitly to confirm you mean to mutate live Stripe data.',
    );

  const mode: 'test' | 'live' = isLiveKey ? 'live' : 'test';
  console.error(`LevelUp Stripe setup — ${mode.toUpperCase()} mode`);
  console.error(`version tag: ${VERSION}`);
  console.error('');

  const stripe = new Stripe(key, {
    // Pin a version so the script behaves the same across Stripe SDK upgrades.
    apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
    appInfo: { name: 'levelup-setup-stripe-products', version: VERSION },
  });

  const sidecarPath = resolve(process.cwd(), '.stripe-products.json');
  // Read existing sidecar (if any) to preserve unknown fields between runs.
  if (existsSync(sidecarPath)) {
    try {
      JSON.parse(readFileSync(sidecarPath, 'utf8')) as SidecarShape;
    } catch {
      console.error('WARN: .stripe-products.json exists but is not valid JSON; overwriting.');
    }
  }

  let productsCreated = 0;
  let pricesCreated = 0;
  const envLines: string[] = [];
  const sidecarProducts: SidecarShape['products'] = [];
  const rawProducts: Stripe.Product[] = [];
  const rawPrices: Stripe.Price[] = [];

  for (const spec of PRODUCTS) {
    console.error(`tier ${spec.tier}:`);
    const { product, created: pCreated } = await ensureProduct(stripe, spec);
    if (pCreated) productsCreated++;
    rawProducts.push(product);

    const sidecarPrices: SidecarShape['products'][number]['prices'] = [];
    for (const priceSpec of spec.prices) {
      const { price, created: prCreated } = await ensurePrice(stripe, product.id, priceSpec);
      if (prCreated) pricesCreated++;
      rawPrices.push(price);
      envLines.push(`${priceSpec.envVar}=${price.id}`);
      sidecarPrices.push({
        envVar: priceSpec.envVar,
        priceId: price.id,
        tier: priceSpec.tier,
        interval: priceSpec.interval,
        unitAmount: priceSpec.unitAmount,
        recurring: priceSpec.recurring,
        perSeat: priceSpec.perSeat,
      });
    }
    sidecarProducts.push({
      tier: spec.tier,
      productId: product.id,
      productKey: spec.productKey,
      name: spec.name,
      prices: sidecarPrices,
    });
  }

  const sidecar: SidecarShape = {
    generatedAt: new Date().toISOString(),
    mode,
    version: VERSION,
    products: sidecarProducts,
    raw: { products: rawProducts, prices: rawPrices },
  };
  writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2) + '\n');

  console.error('');
  console.error(`Done. Products created: ${productsCreated}. Prices created: ${pricesCreated}.`);
  console.error(
    `Sidecar written to ${sidecarPath} (gitignored). Run \`cat .stripe-products.json\` to review.`,
  );
  console.error('');
  console.error('Env var block (paste into .env):');
  console.error('');
  // Env block goes to stdout so it can be piped: `... > prices.env`
  for (const line of envLines) console.log(line);
  console.error('');
  console.error(
    `Verify in Stripe dashboard: https://dashboard.stripe.com/${mode === 'test' ? 'test/' : ''}products`,
  );
}

main().catch((err) => {
  console.error('FAILED:', err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
