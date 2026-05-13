import { CeoLawyerHero } from '@/components/ceolawyer/hero';
import { CeoLawyerRoles } from '@/components/ceolawyer/roles';
import { CeoLawyerHowItWorks } from '@/components/ceolawyer/how-it-works';
import { CeoLawyerValueProps } from '@/components/ceolawyer/value-props';
import { CeoLawyerTrustStrip } from '@/components/ceolawyer/trust-strip';
import { CeoLawyerPricingTeaser } from '@/components/ceolawyer/pricing-teaser';
import { CeoLawyerFinalCta } from '@/components/ceolawyer/final-cta';

export default function CeoLawyerLandingPage() {
  return (
    <>
      <CeoLawyerHero />
      <CeoLawyerRoles />
      <CeoLawyerHowItWorks />
      <CeoLawyerValueProps />
      <CeoLawyerTrustStrip />
      <CeoLawyerPricingTeaser />
      <CeoLawyerFinalCta />
    </>
  );
}
