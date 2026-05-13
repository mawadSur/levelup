import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Footer } from '@/components/marketing/footer';
import { PricingClient } from '@/components/marketing/pricing-client';
import { IS_KAPITUS, IS_CEOLAWYER } from '@/lib/client';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Per-seat pricing that scales with your team. 14-day trial, no credit card required.',
};

export default function PricingPage() {
  if (IS_KAPITUS || IS_CEOLAWYER) {
    redirect('/#pricing');
  }
  // satisfy TS — redirect() throws, but the type narrowing above is enough
  void notFound;

  return (
    <div className="flex min-h-screen flex-col bg-ink-900">
      <MarketingNav />
      <main className="flex-1">
        <PricingClient />
      </main>
      <Footer />
    </div>
  );
}
