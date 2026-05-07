import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import type { CreateCheckoutSessionInput } from '@levelup/types';
import { Button } from '@levelup/ui';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Footer } from '@/components/marketing/footer';
import { CheckoutButton } from '@/components/marketing/checkout-button';
import { PlanCard } from '@/components/marketing/plan-card';
import { getSessionUser } from '@/lib/auth-client';

export const metadata: Metadata = {
  title: 'Pricing — LevelUp AI Academy',
  description: 'Simple, transparent pricing that scales with your team.',
};

// ---------------------------------------------------------------------------
// Feature comparison data
// ---------------------------------------------------------------------------

const FEATURES = [
  { label: 'Users included', starter: 'Up to 50', growth: 'Up to 250', enterprise: '500+' },
  { label: 'Core AI learning paths', starter: true, growth: true, enterprise: true },
  { label: 'AI coaching assistant', starter: true, growth: true, enterprise: true },
  { label: 'Admin dashboard', starter: true, growth: true, enterprise: true },
  { label: 'Basic reporting', starter: true, growth: true, enterprise: true },
  { label: 'Custom learning paths', starter: false, growth: true, enterprise: true },
  { label: 'Department reporting', starter: false, growth: true, enterprise: true },
  { label: 'Company AI policy integration', starter: false, growth: true, enterprise: true },
  { label: 'Completion certificates', starter: false, growth: true, enterprise: true },
  { label: 'SSO / SAML', starter: false, growth: false, enterprise: true },
  { label: 'Custom onboarding', starter: false, growth: false, enterprise: true },
  { label: 'Advanced analytics', starter: false, growth: false, enterprise: true },
  { label: 'Dedicated success manager', starter: false, growth: false, enterprise: true },
  { label: 'Custom AI governance modules', starter: false, growth: false, enterprise: true },
  { label: 'Private deployment options', starter: false, growth: false, enterprise: true },
  { label: 'SLA & support', starter: 'Email', growth: 'Priority email', enterprise: 'Custom' },
] as const;

type FeatureValue = boolean | string;

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true)
    return (
      <span className="flex justify-center">
        <Check className="h-5 w-5 text-primary" aria-label="Included" />
      </span>
    );
  if (value === false)
    return (
      <span className="flex justify-center text-muted-foreground">
        <Minus className="h-4 w-4" aria-label="Not included" />
      </span>
    );
  return <span className="text-center text-sm text-muted-foreground">{value}</span>;
}

// ---------------------------------------------------------------------------
// FAQ data
// ---------------------------------------------------------------------------

const FAQS = [
  {
    q: 'Do annual contracts get a discount?',
    a: 'Yes — annual billing saves 20% vs. month-to-month. Contact sales to discuss multi-year options, which qualify for additional discounts.',
  },
  {
    q: 'Can we add seats mid-cycle?',
    a: 'Absolutely. You can add seats at any time; additional seats are prorated to your current billing period and added to your next invoice.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards (Visa, Mastercard, Amex) via Stripe. Enterprise customers can also pay by wire transfer or ACH with net-30 terms.',
  },
  {
    q: 'Is there a free trial?',
    a: "We offer a 30-day pilot program for teams of up to 25 users. Reach out to our team and we'll get you set up the same day — no credit card required.",
  },
  {
    q: 'Do you offer a pilot program?',
    a: 'Yes. Our structured 30-day pilot includes up to 25 users, guided onboarding, one live Q&A session with our team, and a full readout report at the end.',
  },
] as const;

// ---------------------------------------------------------------------------
// Plan CTA — server decides signed-in vs. signed-out branch
// ---------------------------------------------------------------------------

async function PlanCta({
  plan,
  label,
  isFeatured,
}: {
  plan: CreateCheckoutSessionInput['plan'];
  label: string;
  isFeatured?: boolean;
}) {
  const user = await getSessionUser();

  if (user) {
    return (
      <CheckoutButton
        plan={plan}
        label={label}
        variant={isFeatured ? 'default' : 'outline'}
        className="w-full"
      />
    );
  }

  return (
    <Button asChild variant={isFeatured ? 'default' : 'outline'} className="w-full">
      <Link href={`/sign-up?plan=${plan.toLowerCase()}`}>{label}</Link>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />

      <main className="flex-1">
        {/* ---- Hero header ---- */}
        <section className="mx-auto max-w-7xl px-4 pt-20 pb-12 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Pricing that scales with your team.
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">Pilot in 30 days. Cancel anytime.</p>
        </section>

        {/* ---- Plan cards ---- */}
        <section
          aria-labelledby="plans-heading"
          className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
        >
          <h2 id="plans-heading" className="sr-only">
            Pricing plans
          </h2>
          <div className="grid gap-8 md:grid-cols-3 md:items-end">
            {/* Starter */}
            <PlanCard
              name="Starter"
              price="$499"
              period="/mo"
              description="Up to 50 users"
              features={[
                'Core AI learning paths',
                'AI coaching assistant',
                'Admin dashboard',
                'Basic reporting',
              ]}
              cta={<PlanCta plan="STARTER" label="Start with Starter" />}
            />

            {/* Growth — highlighted */}
            <PlanCard
              name="Growth"
              price="$1,499"
              period="/mo"
              description="Up to 250 users"
              features={[
                'Everything in Starter',
                'Custom learning paths',
                'Department reporting',
                'Company AI policy integration',
                'Completion certificates',
              ]}
              highlight
              cta={<PlanCta plan="GROWTH" label="Choose Growth" isFeatured />}
            />

            {/* Enterprise */}
            <PlanCard
              name="Enterprise"
              price="Custom"
              description="500+ users"
              features={[
                'Everything in Growth',
                'SSO / SAML',
                'Custom onboarding',
                'Advanced analytics',
                'Dedicated success manager',
                'Custom AI governance modules',
                'Private deployment options',
              ]}
              cta={
                <Button asChild variant="outline" className="w-full">
                  <a href="mailto:hello@levelup.example">Contact sales</a>
                </Button>
              }
            />
          </div>
        </section>

        {/* ---- Feature comparison table (md+) ---- */}
        <section
          aria-labelledby="compare-heading"
          className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
        >
          <h2
            id="compare-heading"
            className="mb-8 text-2xl font-bold tracking-tight text-foreground"
          >
            Compare plans
          </h2>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold text-foreground">Starter</th>
                  <th className="px-6 py-4 text-center font-semibold text-primary">Growth</th>
                  <th className="px-6 py-4 text-center font-semibold text-foreground">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FEATURES.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="px-6 py-3 font-medium text-foreground">{row.label}</td>
                    <td className="px-6 py-3">
                      <FeatureCell value={row.starter} />
                    </td>
                    <td className="px-6 py-3">
                      <FeatureCell value={row.growth} />
                    </td>
                    <td className="px-6 py-3">
                      <FeatureCell value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile per-plan lists */}
          <div className="space-y-6 md:hidden">
            {(
              [
                { name: 'Starter', key: 'starter' },
                { name: 'Growth', key: 'growth' },
                { name: 'Enterprise', key: 'enterprise' },
              ] as const
            ).map(({ name, key }) => (
              <div key={name} className="rounded-xl border border-border p-5">
                <h3 className="mb-4 text-lg font-bold text-foreground">{name}</h3>
                <ul className="space-y-2">
                  {FEATURES.map((row) => (
                    <li key={row.label} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <FeatureCell value={row[key]} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ---- FAQ ---- */}
        <section
          id="pricing-faq"
          aria-labelledby="faq-heading"
          className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8"
        >
          <h2
            id="faq-heading"
            className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground"
          >
            Frequently asked questions
          </h2>
          <div className="space-y-0 divide-y divide-border rounded-xl border border-border overflow-hidden">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground">
                  {q}
                  <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---- Final CTA strip ---- */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Not sure which plan? Talk to us.
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              We'll help you find the right fit for your team size and goals.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="default">
                <a href="mailto:hello@levelup.example">Get a demo</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
