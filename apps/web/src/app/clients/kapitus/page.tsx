import { KapitusHero } from '@/components/kapitus/hero';
import { KapitusProblemStats } from '@/components/kapitus/problem-stats';
import { KapitusHowItWorks } from '@/components/kapitus/how-it-works';

export default function KapitusLandingPage() {
  return (
    <>
      <KapitusHero />
      <KapitusProblemStats />
      <KapitusHowItWorks />
    </>
  );
}
