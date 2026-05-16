import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { track } from '@levelup/analytics';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Footer } from '@/components/marketing/footer';
import { PricingClient } from '@/components/marketing/pricing-client';
import { PricingClientV2 } from '@/components/marketing/pricing-client-v2';
import { evaluateAnonFlag } from '@/lib/flags/server-flag';
import { IS_KAPITUS, IS_CEOLAWYER } from '@/lib/client';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Per-seat pricing that scales with your team. 14-day trial, no credit card required.',
};

// A/B-test scaffolding (Wave 4 / CR.27). The `pricing_v2` flag controls which
// variant unauthenticated visitors see on /pricing. Defaults to 0% rollout —
// every visitor gets V1 (control) until ops flips the percentage in
// `lib/flags/server-flag.ts`. PostHog `pricing_variant_exposed` events let
// us measure conversion lift once the experiment is live.
const PRICING_FLAG_KEY = 'pricing_v2';

export default async function PricingPage() {
  if (IS_KAPITUS || IS_CEOLAWYER) {
    redirect('/#pricing');
  }
  // satisfy TS — redirect() throws, but the type narrowing above is enough
  void notFound;

  const flag = await evaluateAnonFlag(PRICING_FLAG_KEY);

  // Server-side exposure event. `track.*` is no-op safe when PostHog isn't
  // configured (stub mode), so this can't throw or affect render. We use
  // `anonId` as `organizationId` because no real org exists pre-signup — it
  // gives us a stable group key in PostHog for joining to downstream
  // signup/checkout events from the same visitor.
  track.pricingVariantExposed({
    organizationId: flag.anonId,
    flagKey: PRICING_FLAG_KEY,
    variant: flag.variant,
    anonId: flag.anonId,
  });

  return (
    <div className="flex min-h-screen flex-col bg-ink-900">
      <MarketingNav />
      <main className="flex-1">{flag.enabled ? <PricingClientV2 /> : <PricingClient />}</main>
      <Footer />
    </div>
  );
}
