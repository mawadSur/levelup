import Link from 'next/link';
import { Button, MonoLabel, NumberedSection } from '@levelup/ui';
import { PlanCard } from './plan-card';

const PLANS = [
  {
    name: 'Starter',
    price: '$499',
    period: '/MONTH',
    description: 'For smaller teams starting their AI training program.',
    features: [
      'Up to 50 seats',
      'All 8 role-based learning paths',
      'Built-in AI coach',
      'Basic completion reporting',
    ],
    cta: 'Start free trial',
    ctaHref: '/sign-up?plan=starter',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$1,499',
    period: '/MONTH',
    description: 'For mid-size organizations that need visibility and control.',
    features: [
      'Up to 250 seats',
      'Everything in Starter',
      'Department heatmaps and risk flags',
      'Company policy upload and guardrails',
      'CSV export and API access',
    ],
    cta: 'Get a demo',
    ctaHref: '/sign-up?plan=growth',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with complex requirements.',
    features: [
      'Unlimited seats',
      'Everything in Growth',
      'SSO and SCIM provisioning',
      'Dedicated customer success',
      'Custom learning paths and branding',
    ],
    cta: 'Talk to sales',
    ctaHref: '/sign-up?plan=enterprise',
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
              All plans include a 30-day pilot. No training required to launch. No procurement
              labyrinth.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 sm:items-stretch">
            {PLANS.map(
              ({ name, price, period, description, features, cta, ctaHref, highlight }) => (
                <PlanCard
                  key={name}
                  name={name}
                  price={price}
                  period={period}
                  description={description}
                  features={features}
                  highlight={highlight}
                  cta={
                    <Button
                      asChild
                      variant={highlight ? 'primary' : 'secondary'}
                      className="w-full"
                    >
                      <Link href={ctaHref}>{cta}</Link>
                    </Button>
                  }
                />
              ),
            )}
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
