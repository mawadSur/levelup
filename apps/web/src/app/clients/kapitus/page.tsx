import { KapitusHero } from '@/components/kapitus/hero';
import { KapitusProblemStats } from '@/components/kapitus/problem-stats';
import { KapitusHowItWorks } from '@/components/kapitus/how-it-works';
import { KapitusRoles } from '@/components/kapitus/roles';
import { KapitusGovernanceMock } from '@/components/kapitus/governance-mock';
import { KapitusPricing } from '@/components/kapitus/pricing';

export default function KapitusLandingPage() {
  return (
    <>
      <KapitusHero />
      <KapitusProblemStats />
      <KapitusHowItWorks />
      <KapitusRoles />
      <KapitusGovernanceMock />
      <KapitusPricing />
    </>
  );
}
