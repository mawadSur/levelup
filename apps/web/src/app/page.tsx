import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Hero } from '@/components/marketing/hero';
import { TrustBar } from '@/components/marketing/trust-bar';
import { ProblemStatement } from '@/components/marketing/problem-statement';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { PricingTeaser } from '@/components/marketing/pricing-teaser';
import { Faq } from '@/components/marketing/faq';
import { FinalCta } from '@/components/marketing/final-cta';
import { Footer } from '@/components/marketing/footer';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <ProblemStatement />
        <HowItWorks />
        <FeatureGrid />
        <PricingTeaser />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
