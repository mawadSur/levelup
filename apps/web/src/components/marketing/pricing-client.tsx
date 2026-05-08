'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, MissionNumber, MonoLabel, NumberedSection } from '@levelup/ui';
import { PlanCard } from './plan-card';
import { PerSeatSlider } from './per-seat-slider';
import { PricingToggle, type BillingIntervalChoice } from './pricing-toggle';
import { ComparisonTable } from './comparison-table';
import { PricingFaq } from './pricing-faq';

// ---------------------------------------------------------------------------
// Static plan data — mirrors PLAN_CONFIG in @levelup/billing.
// Kept inline (rather than imported from @levelup/billing) so the marketing
// route doesn't pull Prisma into the client bundle.
// ---------------------------------------------------------------------------

const PLAN_DATA = {
  TRIAL: {
    days: 14,
    maxSeats: 10,
  },
  STARTER: {
    monthlyPriceUsd: 599,
    annualPriceUsd: 5990,
    maxSeats: 25,
  },
  TEAM: {
    monthlyPerSeatUsd: 12,
    annualPerSeatUsd: 10,
    minSeats: 25,
    maxSeats: 100,
    defaultSeats: 50,
  },
  GROWTH: {
    monthlyPerSeatUsd: 15,
    annualPerSeatUsd: 13,
    minSeats: 100,
    maxSeats: 500,
    defaultSeats: 150,
  },
  ENTERPRISE: {
    anchorAnnualUsd: 25_000,
  },
} as const;

export function PricingClient() {
  const [interval, setInterval] = React.useState<BillingIntervalChoice>('ANNUAL');
  const [teamSeats, setTeamSeats] = React.useState<number>(PLAN_DATA.TEAM.defaultSeats);
  const [growthSeats, setGrowthSeats] = React.useState<number>(PLAN_DATA.GROWTH.defaultSeats);

  const teamPerSeat =
    interval === 'ANNUAL' ? PLAN_DATA.TEAM.annualPerSeatUsd : PLAN_DATA.TEAM.monthlyPerSeatUsd;
  const growthPerSeat =
    interval === 'ANNUAL' ? PLAN_DATA.GROWTH.annualPerSeatUsd : PLAN_DATA.GROWTH.monthlyPerSeatUsd;

  const teamMonthlyTotal = teamSeats * teamPerSeat;
  const growthMonthlyTotal = growthSeats * growthPerSeat;

  const teamCycleTotal = interval === 'ANNUAL' ? teamMonthlyTotal * 12 : teamMonthlyTotal;
  const growthCycleTotal = interval === 'ANNUAL' ? growthMonthlyTotal * 12 : growthMonthlyTotal;

  const starterPrice =
    interval === 'ANNUAL' ? PLAN_DATA.STARTER.annualPriceUsd : PLAN_DATA.STARTER.monthlyPriceUsd;

  const intervalLower = interval.toLowerCase();
  const cyclePeriod = interval === 'ANNUAL' ? '/YR' : '/MO';

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="border-b border-ink-600 bg-ink-900 py-20 lg:py-28">
        <div className="mx-auto max-w-content px-6 lg:px-8">
          <div className="mb-10 flex items-baseline gap-4">
            <MonoLabel className="text-paper-500">MISSION BRIEF · COMMERCE</MonoLabel>
            <span className="h-px max-w-[12rem] flex-1 bg-ink-500" aria-hidden />
            <MonoLabel tone="signal">2026.05</MonoLabel>
          </div>
          <div className="grid gap-12 lg:grid-cols-[7fr,5fr] lg:items-end">
            <h1 className="font-serif text-display-xl text-paper-100">
              <span className="font-serif italic">The price of a fluent team.</span>
            </h1>
            <p className="text-body-lg text-paper-300 max-w-reading">
              Per-seat pricing that scales with your team. Trial free for 14 days, pay only for the
              seats you fill, and add more on the same day you hire. Annual contracts save 17%
              versus month-to-month.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- STICKY INTERVAL TOGGLE ---------- */}
      <section
        aria-label="Billing interval"
        className="sticky top-0 z-30 border-b border-ink-600 bg-ink-900/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-content items-center justify-between gap-6 px-6 py-4 lg:px-8">
          <MonoLabel className="text-paper-500">BILLING CYCLE</MonoLabel>
          <PricingToggle value={interval} onChange={setInterval} />
        </div>
      </section>

      {/* ---------- PLAN CARDS ---------- */}
      <section
        aria-labelledby="plans-heading"
        className="border-b border-ink-600 bg-ink-900 py-20 lg:py-24"
      >
        <div className="mx-auto max-w-content px-6 lg:px-8">
          <h2 id="plans-heading" className="sr-only">
            Pricing plans
          </h2>

          {/* TRIAL banner — sits above the 4 paid cards */}
          <div className="mb-10 grid gap-4 border border-dashed border-signal-dim bg-ink-800 p-6 rounded-sm sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="space-y-2">
              <MonoLabel tone="signal">TRIAL · 14 DAYS · NO CARD</MonoLabel>
              <p className="font-serif text-display-md italic text-paper-100">
                Try the full product for free.
              </p>
              <p className="text-body-sm text-paper-300 max-w-reading">
                Up to {PLAN_DATA.TRIAL.maxSeats} seats. Full curriculum, in-context coach, admin
                dashboard. After {PLAN_DATA.TRIAL.days} days, soft caps engage until you upgrade —
                nothing is deleted.
              </p>
            </div>
            <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
              <Link href="/sign-up">BEGIN TRIAL →</Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-4 lg:items-stretch">
            {/* STARTER — flat rate */}
            <PlanCard
              tier="STARTER"
              description="A small AI team in the door. Up to 25 seats, flat rate, no slider needed."
              price={
                <>
                  <MissionNumber value={starterPrice} format="currency" />
                  <span className="ml-2 align-baseline font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    {cyclePeriod}
                  </span>
                </>
              }
              priceCaption={`UP TO ${PLAN_DATA.STARTER.maxSeats} SEATS · FLAT RATE`}
              features={[
                'Core AI learning paths',
                'In-context coach',
                'Admin dashboard',
                'Basic reporting',
                'Email support',
              ]}
              cta={
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/sign-up?plan=starter&interval=${intervalLower}`}>CHECKOUT →</Link>
                </Button>
              }
            />

            {/* TEAM — per seat, recommended */}
            <PlanCard
              tier="TEAM"
              badge="MOST POPULAR"
              highlight
              description="Per-seat pricing for the whole AI-using team. Add seats the day you hire."
              price={
                <>
                  <MissionNumber value={teamPerSeat} format="currency" />
                  <span className="ml-1 align-baseline font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    /SEAT/MO
                  </span>
                </>
              }
              priceCaption={
                interval === 'ANNUAL'
                  ? `BILLED ANNUALLY · ${PLAN_DATA.TEAM.minSeats}–${PLAN_DATA.TEAM.maxSeats} SEATS`
                  : `BILLED MONTHLY · ${PLAN_DATA.TEAM.minSeats}–${PLAN_DATA.TEAM.maxSeats} SEATS`
              }
              seatControl={
                <PerSeatSlider
                  value={teamSeats}
                  onChange={setTeamSeats}
                  min={PLAN_DATA.TEAM.minSeats}
                  max={PLAN_DATA.TEAM.maxSeats}
                  step={5}
                  label={`SEATS · ${teamSeats}`}
                />
              }
              total={
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span>{interval === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY'} TOTAL</span>
                    <span className="font-serif text-h2 italic tabular-nums text-paper-100 normal-case">
                      <MissionNumber value={teamCycleTotal} format="currency" />
                      <span className="ml-1 font-mono text-mono-sm not-italic uppercase tracking-[0.05em] text-paper-500">
                        {cyclePeriod}
                      </span>
                    </span>
                  </div>
                  {interval === 'ANNUAL' ? (
                    <div className="text-[11px] text-paper-500">
                      ≈ <MissionNumber value={teamMonthlyTotal} format="currency" />
                      /MO equivalent
                    </div>
                  ) : null}
                </div>
              }
              features={[
                'Everything in Starter',
                'Custom learning paths',
                'Department reporting',
                'Company AI policy integration',
                'Completion certificates',
              ]}
              cta={
                <Button asChild variant="primary" className="w-full">
                  <Link
                    href={`/sign-up?plan=team&interval=${intervalLower}&seats=${teamSeats}`}
                  >
                    CHECKOUT →
                  </Link>
                </Button>
              }
            />

            {/* GROWTH — per seat */}
            <PlanCard
              tier="GROWTH"
              description="Mid-market with SSO, custom paths, and policy guardrails baked in."
              price={
                <>
                  <MissionNumber value={growthPerSeat} format="currency" />
                  <span className="ml-1 align-baseline font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    /SEAT/MO
                  </span>
                </>
              }
              priceCaption={
                interval === 'ANNUAL'
                  ? `BILLED ANNUALLY · ${PLAN_DATA.GROWTH.minSeats}–${PLAN_DATA.GROWTH.maxSeats} SEATS`
                  : `BILLED MONTHLY · ${PLAN_DATA.GROWTH.minSeats}–${PLAN_DATA.GROWTH.maxSeats} SEATS`
              }
              seatControl={
                <PerSeatSlider
                  value={growthSeats}
                  onChange={setGrowthSeats}
                  min={PLAN_DATA.GROWTH.minSeats}
                  max={PLAN_DATA.GROWTH.maxSeats}
                  step={10}
                  label={`SEATS · ${growthSeats}`}
                />
              }
              total={
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span>{interval === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY'} TOTAL</span>
                    <span className="font-serif text-h2 italic tabular-nums text-paper-100 normal-case">
                      <MissionNumber value={growthCycleTotal} format="currency" />
                      <span className="ml-1 font-mono text-mono-sm not-italic uppercase tracking-[0.05em] text-paper-500">
                        {cyclePeriod}
                      </span>
                    </span>
                  </div>
                  {interval === 'ANNUAL' ? (
                    <div className="text-[11px] text-paper-500">
                      ≈ <MissionNumber value={growthMonthlyTotal} format="currency" />
                      /MO equivalent
                    </div>
                  ) : null}
                </div>
              }
              features={[
                'Everything in Team',
                'SSO / SAML',
                'Custom learning paths',
                'Advanced analytics',
                'Priority support',
              ]}
              cta={
                <Button asChild variant="primary" className="w-full">
                  <Link
                    href={`/sign-up?plan=growth&interval=${intervalLower}&seats=${growthSeats}`}
                  >
                    CHECKOUT →
                  </Link>
                </Button>
              }
            />

            {/* ENTERPRISE — sales led */}
            <PlanCard
              tier="ENTERPRISE"
              badge="SALES-LED"
              compact
              description="500+ employees. SOC 2 attestation support, custom DPA/MSA, dedicated success."
              price={
                <span className="text-paper-100">
                  <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    FROM
                  </span>{' '}
                  <MissionNumber value={PLAN_DATA.ENTERPRISE.anchorAnnualUsd} format="currency" />
                  <span className="ml-1 align-baseline font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    /YR
                  </span>
                </span>
              }
              priceCaption="ANCHOR · TALK TO SALES"
              features={[
                '500+ employees',
                'SSO / SCIM provisioning',
                'SOC 2 attestation support',
                'Custom DPA / MSA',
                'Dedicated success manager',
                'Private deployment options',
              ]}
              cta={
                <Button asChild variant="secondary" className="w-full">
                  <Link href="mailto:hello@ailevel.app?subject=LevelUp%20Enterprise">
                    TALK TO SALES →
                  </Link>
                </Button>
              }
            />
          </div>
        </div>
      </section>

      {/* ---------- COMPARISON ---------- */}
      <section
        aria-labelledby="compare-heading"
        className="border-b border-ink-600 bg-ink-900 py-24 lg:py-28"
      >
        <div className="mx-auto max-w-content px-6 lg:px-8">
          <NumberedSection numeral="II." eyebrow="COMPARE PLANS">
            <h2 id="compare-heading" className="sr-only">
              Compare plans
            </h2>
            <ComparisonTable interval={interval} />
          </NumberedSection>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section
        id="pricing-faq"
        aria-labelledby="faq-heading"
        className="border-b border-ink-600 bg-ink-900 py-24 lg:py-28"
      >
        <div className="mx-auto max-w-content px-6 lg:px-8">
          <NumberedSection numeral="III." eyebrow="THE QUESTIONS">
            <h2 id="faq-heading" className="sr-only">
              Frequently asked questions
            </h2>
            <PricingFaq />
          </NumberedSection>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="bg-ink-900">
        <div className="mx-auto max-w-content px-6 py-24 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[7fr,5fr] lg:items-end">
            <h2 className="font-serif text-display-lg text-paper-100">
              Not sure which plan?{' '}
              <span className="font-serif italic text-paper-300">Talk to us.</span>
            </h2>
            <div className="flex flex-col items-start gap-4">
              <p className="text-body-lg text-paper-300">
                We&apos;ll match you to the right configuration for your team size and goals — or
                drop you straight into the trial.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" variant="primary">
                  <Link href="/sign-up">BEGIN TRIAL →</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="mailto:hello@ailevel.app?subject=LevelUp%20Demo">REQUEST DEMO →</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
