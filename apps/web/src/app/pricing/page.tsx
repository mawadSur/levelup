import type { Metadata } from 'next';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Footer } from '@/components/marketing/footer';
import { PricingClient } from '@/components/marketing/pricing-client';

export const metadata: Metadata = {
  title: 'Pricing — LevelUp AI Academy',
  description:
    'Per-seat pricing that scales with your team. 14-day trial, no credit card required.',
};

export default function PricingPage() {
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
