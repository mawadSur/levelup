'use client';

import Link from 'next/link';
import { Button } from '@levelup/ui';
import { ScrollReveal } from '@/lib/motion/scroll-reveal';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';
import { PlanCard } from './plan-card';

const PLANS = [
  {
    name: 'Starter',
    price: '$499',
    period: '/month',
    description: 'For smaller teams starting their AI training program.',
    features: [
      'Up to 50 seats',
      'All 8 role-based learning paths',
      'Built-in AI coach',
      'Basic completion reporting',
    ],
    cta: 'Start free trial',
    ctaHref: 'mailto:hello@levelup.example?subject=Starter plan',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$1,499',
    period: '/month',
    description: 'For mid-size organizations that need visibility and control.',
    features: [
      'Up to 250 seats',
      'Everything in Starter',
      'Department heatmaps and risk flags',
      'Company policy upload and guardrails',
      'CSV export and API access',
    ],
    cta: 'Get a demo',
    ctaHref: 'mailto:hello@levelup.example?subject=Growth plan',
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
    ctaHref: 'mailto:hello@levelup.example?subject=Enterprise plan',
    highlight: false,
  },
];

export function PricingTeaser() {
  return (
    <section className="py-20 sm:py-28 bg-muted/20" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Pricing that scales with your team.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            All plans include a 30-day pilot. No training required to launch.
          </p>
        </ScrollReveal>

        {/* items-end so the taller Growth card naturally sticks up at the top */}
        <Stagger className="grid gap-8 sm:grid-cols-3 items-end">
          {PLANS.map(({ name, price, period, description, features, cta, ctaHref, highlight }) => (
            <ScrollItem key={name}>
              <PlanCard
                name={name}
                price={price}
                period={period}
                description={description}
                features={features}
                highlight={highlight}
                cta={
                  <Button asChild variant={highlight ? 'default' : 'outline'} className="w-full">
                    <Link href={ctaHref}>{cta}</Link>
                  </Button>
                }
              />
            </ScrollItem>
          ))}
        </Stagger>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Need more detail?{' '}
          <Link href="/pricing" className="text-primary underline-offset-4 hover:underline">
            See the full pricing page
          </Link>{' '}
          with seat-by-seat estimates and an ROI calculator.
        </p>
      </div>
    </section>
  );
}
