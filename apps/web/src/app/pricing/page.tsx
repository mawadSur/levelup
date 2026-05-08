import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import type { CreateCheckoutSessionInput } from '@levelup/types';
import { Button, MonoLabel, NumberedSection } from '@levelup/ui';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Footer } from '@/components/marketing/footer';
import { CheckoutButton } from '@/components/marketing/checkout-button';
import { PlanCard } from '@/components/marketing/plan-card';
import { getSessionUser } from '@/lib/auth-client';

export const metadata: Metadata = {
  title: 'Pricing — LevelUp AI Academy',
  description: 'Pricing that scales with your team. Pilot in thirty days. Cancel any time.',
};

// ---------------------------------------------------------------------------
// Feature comparison data
// ---------------------------------------------------------------------------

const FEATURES = [
  { label: 'Seats included', starter: 'Up to 50', growth: 'Up to 250', enterprise: '500+' },
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
  { label: 'Private deployment', starter: false, growth: false, enterprise: true },
  { label: 'SLA & support', starter: 'Email', growth: 'Priority email', enterprise: 'Custom' },
] as const;

type FeatureValue = boolean | string;

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true)
    return (
      <span className="flex justify-center">
        <Check className="h-4 w-4 text-signal" aria-label="Included" />
      </span>
    );
  if (value === false)
    return (
      <span className="flex justify-center text-paper-500">
        <Minus className="h-4 w-4" aria-label="Not included" />
      </span>
    );
  return (
    <span className="block text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
      {value}
    </span>
  );
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
    a: "We offer a 30-day pilot program for teams of up to 25 users. Reach out and we'll get you set up the same day — no credit card required.",
  },
  {
    q: 'Do you offer a pilot program?',
    a: 'Yes. Our structured 30-day pilot includes up to 25 users, guided onboarding, one live Q&A session, and a full readout report at the end.',
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
    <Button asChild variant={isFeatured ? 'primary' : 'secondary'} className="w-full">
      <Link href={`/sign-up?plan=${plan.toLowerCase()}`}>{label}</Link>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-900">
      <MarketingNav />

      <main className="flex-1">
        {/* ---- Hero header ---- */}
        <section className="border-b border-ink-600 bg-ink-900 py-20 lg:py-28">
          <div className="mx-auto max-w-content px-6 lg:px-8">
            <div className="mb-10 flex items-baseline gap-4">
              <MonoLabel className="text-paper-500">MISSION BRIEF / PRICING</MonoLabel>
              <span className="h-px max-w-[12rem] flex-1 bg-ink-500" aria-hidden />
              <MonoLabel tone="signal">2026.05</MonoLabel>
            </div>
            <div className="grid gap-12 lg:grid-cols-[7fr,5fr] lg:items-end">
              <h1 className="font-serif text-display-xl text-paper-100">
                The price of a <em className="italic text-signal">fluent</em> team.
              </h1>
              <p className="text-body-lg text-paper-300">
                Pilot in thirty days. Cancel any time. All plans include the core curriculum, the
                in-context coach, and an admin dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Plan cards ---- */}
        <section
          aria-labelledby="plans-heading"
          className="border-b border-ink-600 bg-ink-900 py-20 lg:py-24"
        >
          <div className="mx-auto max-w-content px-6 lg:px-8">
            <h2 id="plans-heading" className="sr-only">
              Pricing plans
            </h2>
            <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
              <PlanCard
                name="Starter"
                price="$499"
                period="/MONTH"
                description="Up to 50 seats. Bring AI literacy to a single team."
                features={[
                  'Core AI learning paths',
                  'AI coaching assistant',
                  'Admin dashboard',
                  'Basic reporting',
                ]}
                cta={<PlanCta plan="STARTER" label="Start with Starter" />}
              />

              <PlanCard
                name="Growth"
                price="$1,499"
                period="/MONTH"
                description="Up to 250 seats. Visibility and control across departments."
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

              <PlanCard
                name="Enterprise"
                price="Custom"
                description="500+ seats. Governance, SSO, and dedicated success."
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
                  <Button asChild variant="secondary" className="w-full">
                    <Link href="/sign-up?plan=enterprise">Contact sales</Link>
                  </Button>
                }
              />
            </div>
          </div>
        </section>

        {/* ---- Feature comparison table (md+) ---- */}
        <section
          aria-labelledby="compare-heading"
          className="border-b border-ink-600 bg-ink-900 py-24 lg:py-28"
        >
          <div className="mx-auto max-w-content px-6 lg:px-8">
            <NumberedSection numeral="II." eyebrow="COMPARE PLANS">
              <h2 id="compare-heading" className="sr-only">
                Compare plans
              </h2>

              {/* Desktop table */}
              <div className="hidden overflow-hidden border border-ink-600 rounded-data md:block">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b border-ink-600 bg-ink-800">
                      <th className="px-6 py-4 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                        Feature
                      </th>
                      <th className="px-6 py-4 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                        Starter
                      </th>
                      <th className="px-6 py-4 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">
                        Growth
                      </th>
                      <th className="px-6 py-4 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-600">
                    {FEATURES.map((row) => (
                      <tr key={row.label} className="bg-ink-900 hover:bg-ink-800">
                        <td className="px-6 py-3 text-body-sm text-paper-100">{row.label}</td>
                        <td className="px-6 py-3">
                          <FeatureCell value={row.starter} />
                        </td>
                        <td className="px-6 py-3 bg-ink-800/40">
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
                  <div key={name} className="border border-ink-600 bg-ink-800 p-5 rounded-sm">
                    <MonoLabel tone="signal" className="mb-4 block">
                      {name.toUpperCase()}
                    </MonoLabel>
                    <ul className="space-y-2">
                      {FEATURES.map((row) => (
                        <li
                          key={row.label}
                          className="flex items-center justify-between gap-4 text-body-sm"
                        >
                          <span className="text-paper-300">{row.label}</span>
                          <FeatureCell value={row[key]} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </NumberedSection>
          </div>
        </section>

        {/* ---- FAQ ---- */}
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
              <div className="border-y border-ink-600">
                {FAQS.map(({ q, a }, i) => (
                  <details key={q} className="group border-b border-ink-600 last:border-b-0">
                    <summary className="flex cursor-pointer list-none items-baseline gap-6 px-2 py-6 transition-colors hover:bg-ink-800">
                      <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1 text-body-lg text-paper-100">{q}</span>
                      <span
                        aria-hidden
                        className="font-mono text-xl leading-none text-signal transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="px-2 pb-6 pl-12 text-body-sm text-paper-300 max-w-reading">{a}</p>
                  </details>
                ))}
              </div>
            </NumberedSection>
          </div>
        </section>

        {/* ---- Final CTA strip ---- */}
        <section className="bg-ink-900">
          <div className="mx-auto max-w-content px-6 py-24 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[7fr,5fr] lg:items-end">
              <h2 className="font-serif text-display-lg text-paper-100">
                Not sure which plan? <em className="italic text-paper-300">Talk to us.</em>
              </h2>
              <div className="flex flex-col items-start gap-4">
                <p className="text-body-lg text-paper-300">
                  We&apos;ll match you to the right configuration for your team size and goals.
                </p>
                <Button asChild size="lg" variant="primary">
                  <Link href="/sign-up">REQUEST DEMO →</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
