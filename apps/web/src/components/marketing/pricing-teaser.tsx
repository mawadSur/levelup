import Link from 'next/link';
import { Button, MonoLabel, NumberedSection } from '@levelup/ui';
import { PlanCard } from './plan-card';

const TEASER_PLANS = [
  {
    tier: 'STARTER',
    description: 'Up to 25 seats. A small AI team in the door, flat rate.',
    price: '$599/MO',
    priceCaption: 'FLAT · UP TO 25 SEATS',
    features: [
      'Core AI learning paths',
      'In-context AI coach',
      'Admin dashboard',
      'Basic reporting',
    ],
    cta: 'CHECKOUT →',
    ctaHref: '/sign-up?plan=starter&interval=monthly',
    highlight: false,
  },
  {
    tier: 'TEAM',
    description: 'Per-seat pricing for the whole AI-using team. 25–100 seats.',
    price: '$12/SEAT/MO',
    priceCaption: 'PER-SEAT · MONTHLY',
    features: [
      'Everything in Starter',
      'Custom learning paths',
      'Department reporting',
      'Policy guardrails',
    ],
    cta: 'CHECKOUT →',
    ctaHref: '/sign-up?plan=team&interval=monthly&seats=50',
    highlight: true,
  },
  {
    tier: 'GROWTH',
    description: 'Mid-market with SSO + custom paths. 100–500 seats.',
    price: '$15/SEAT/MO',
    priceCaption: 'PER-SEAT · MONTHLY',
    features: ['Everything in Team', 'SSO / SAML', 'Advanced analytics', 'Priority support'],
    cta: 'CHECKOUT →',
    ctaHref: '/sign-up?plan=growth&interval=monthly&seats=150',
    highlight: false,
  },
];

export function PricingTeaser() {
  return (
    <div id="pricing" className="border-b border-ink-600 bg-ink-900 py-24 lg:py-32">
      <div className="mx-auto max-w-content px-6 lg:px-8">
        <NumberedSection numeral="V." eyebrow="THE PRICE">
          <div className="mb-16 grid gap-8 lg:grid-cols-[7fr,5fr] lg:items-end">
            <h2 className="font-serif text-display-lg text-paper-100">
              Pricing that scales <em className="italic text-paper-300">with the team.</em>
            </h2>
            <p className="text-body-lg text-paper-300">
              Per-seat from the day you start. 14-day trial, no credit card. Annual contracts save
              17% versus monthly.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 sm:items-stretch">
            {TEASER_PLANS.map((plan) => (
              <PlanCard
                key={plan.tier}
                tier={plan.tier}
                description={plan.description}
                price={plan.price}
                priceCaption={plan.priceCaption}
                features={plan.features}
                highlight={plan.highlight}
                cta={
                  <Button
                    asChild
                    variant={plan.highlight ? 'primary' : 'secondary'}
                    className="w-full"
                  >
                    <Link href={plan.ctaHref}>{plan.cta}</Link>
                  </Button>
                }
              />
            ))}
          </div>

          <div className="mt-10 flex items-center justify-center gap-3">
            <MonoLabel className="text-paper-500">FULL COMPARISON</MonoLabel>
            <Link
              href="/pricing"
              className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal underline-offset-4 hover:underline"
            >
              SEE PRICING PAGE →
            </Link>
          </div>
        </NumberedSection>
      </div>
    </div>
  );
}
