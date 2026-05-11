import { IS_KAPITUS } from '@/lib/client';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Hero } from '@/components/marketing/hero';
import { TrustBar } from '@/components/marketing/trust-bar';
import { Brief } from '@/components/marketing/brief';
import { ProblemStatement } from '@/components/marketing/problem-statement';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { PricingTeaser } from '@/components/marketing/pricing-teaser';
import { Faq } from '@/components/marketing/faq';
import { FinalCta } from '@/components/marketing/final-cta';
import { Footer } from '@/components/marketing/footer';
import { KapitusNav } from '@/components/kapitus/nav';
import { KapitusFooter } from '@/components/kapitus/footer';
import { KapitusHero } from '@/components/kapitus/hero';
import { KapitusProblemStats } from '@/components/kapitus/problem-stats';
import { KapitusHowItWorks } from '@/components/kapitus/how-it-works';
import { KapitusRoles } from '@/components/kapitus/roles';
import { KapitusGovernanceMock } from '@/components/kapitus/governance-mock';
import { KapitusPricing } from '@/components/kapitus/pricing';
import { KapitusFaq } from '@/components/kapitus/faq';
import { KapitusFinalCta } from '@/components/kapitus/final-cta';

export default function HomePage() {
  if (IS_KAPITUS) {
    return (
      <div className="flex min-h-screen flex-col">
        <KapitusNav />
        <main className="flex-1">
          <KapitusHero />
          <KapitusProblemStats />
          <KapitusHowItWorks />
          <KapitusRoles />
          <KapitusGovernanceMock />
          <KapitusPricing />
          <KapitusFaq />
          <KapitusFinalCta />
        </main>
        <KapitusFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-900 text-paper-100">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <Brief />
        <HowItWorks />
        <ProblemStatement />
        <FeatureGrid />
        <PricingTeaser />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
