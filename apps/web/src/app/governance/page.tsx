import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, ClipboardCheck, FileText, ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent, MonoLabel, NumberedSection } from '@levelup/ui';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Footer } from '@/components/marketing/footer';
import { GovernanceHero } from '@/components/marketing/governance-hero';
import { GovernanceEvidence } from '@/components/marketing/governance-evidence';
import { GovernanceSecurity } from '@/components/marketing/governance-security';
import { IS_KAPITUS } from '@/lib/client';

export const metadata: Metadata = {
  title: 'AI Governance',
  description:
    'Capture every prompt. Classify the sensitive ones. Train the people who triggered them. Quarterly evidence reports your auditor will accept.',
};

const SHADOW_AI_STATS = [
  {
    numeral: '01',
    headline: '77%',
    body: 'of employees have shared sensitive data with public AI tools.',
    cite: 'eSecurityPlanet · 2024',
  },
  {
    numeral: '02',
    headline: '$50K+',
    body: "average annual spend on AI-DLP tooling employees route around — because the policy isn't taught.",
    cite: 'Internal CISO interviews · 2025',
  },
  {
    numeral: '03',
    headline: '00',
    body: 'training programs that prove your AI governance to an external auditor.',
    cite: 'Until now',
  },
];

const WHAT_YOU_GET = [
  {
    icon: Activity,
    title: 'Real-time classification',
    body: 'Every coach prompt is regex-screened then optionally LLM-checked for credentials, PII, financial data, and internal information. Sub-second decision; never blocks the user.',
  },
  {
    icon: ShieldCheck,
    title: 'Department-level risk scoring',
    body: 'Teams ranked, not individuals. The score combines trigger rate, training completion, and team size — so a 5-person team with two leaks scores higher than a 200-person team with five.',
  },
  {
    icon: ClipboardCheck,
    title: 'Auto-remediation via training',
    body: 'When a trigger fires, the relevant lesson is queued for the user. The trigger feed shows a one-click ASSIGN cta tied to your published policy curriculum.',
  },
  {
    icon: FileText,
    title: 'Audit-ready evidence export',
    body: 'Quarterly portrait-letter PDF with posture KPIs, dept-risk table, top trigger categories, and training paths. Drop it in the SOC 2 binder or the board pack — same artifact.',
  },
];

export default function GovernanceMarketingPage() {
  if (IS_KAPITUS) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-900 text-paper-100">
      <MarketingNav />
      <main className="flex-1">
        <GovernanceHero />

        {/* I. The shadow AI problem */}
        <section className="border-b border-ink-600 bg-ink-900">
          <div className="mx-auto max-w-content px-6 py-20 lg:px-8 lg:py-28">
            <NumberedSection numeral="I." eyebrow="THE SHADOW AI PROBLEM" className="space-y-10">
              <h2 className="font-serif text-display-md italic text-paper-100">
                Your employees use AI. You just can&apos;t prove it.
              </h2>
              <div className="grid gap-6 lg:grid-cols-3">
                {SHADOW_AI_STATS.map((stat) => (
                  <Card key={stat.numeral}>
                    <CardContent className="space-y-4 p-6">
                      <MonoLabel className="text-paper-500">[{stat.numeral}]</MonoLabel>
                      <p className="font-serif text-display-md tabular-nums text-signal">
                        {stat.headline}
                      </p>
                      <p className="text-body-sm text-paper-300">{stat.body}</p>
                      <MonoLabel className="text-paper-500">{stat.cite}</MonoLabel>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </NumberedSection>
          </div>
        </section>

        {/* II. What you get */}
        <section className="border-b border-ink-600 bg-ink-900">
          <div className="mx-auto max-w-content px-6 py-20 lg:px-8 lg:py-28">
            <NumberedSection numeral="II." eyebrow="WHAT YOU GET" className="space-y-10">
              <h2 className="font-serif text-display-md italic text-paper-100">
                Four instruments. One pane of glass.
              </h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {WHAT_YOU_GET.map(({ icon: Icon, title, body }) => (
                  <Card key={title}>
                    <CardContent className="space-y-4 p-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-ink-700">
                        <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
                      </div>
                      <h3 className="font-serif text-h3 italic text-paper-100">{title}</h3>
                      <p className="text-body-sm text-paper-300">{body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </NumberedSection>
          </div>
        </section>

        {/* III. Evidence */}
        <section className="border-b border-ink-600 bg-ink-900">
          <div className="mx-auto max-w-content px-6 py-20 lg:px-8 lg:py-28">
            <NumberedSection numeral="III." eyebrow="THE EVIDENCE" className="space-y-10">
              <GovernanceEvidence />
            </NumberedSection>
          </div>
        </section>

        {/* IV. Pricing */}
        <section className="border-b border-ink-600 bg-ink-900">
          <div className="mx-auto max-w-content px-6 py-20 lg:px-8 lg:py-28">
            <NumberedSection numeral="IV." eyebrow="PRICING" className="space-y-10">
              <Card>
                <CardContent className="grid gap-8 p-8 lg:grid-cols-[1fr,auto] lg:items-center">
                  <div className="space-y-4">
                    <MonoLabel className="text-paper-500">ENTERPRISE · GOVERNANCE TIER</MonoLabel>
                    <p className="font-serif text-display-md italic text-paper-100">
                      From $35,000 / yr · 500 employees.
                    </p>
                    <p className="max-w-reading text-body-lg text-paper-300">
                      Everything in the Growth tier — role-based curriculum, AI coach, certificates,
                      department reporting — plus the governance dashboard, quarterly evidence
                      reports, and SOC 2 attestation support.
                    </p>
                    <ul className="space-y-2 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                      <li>↳ DEDICATED CSM · QUARTERLY GOVERNANCE REVIEW</li>
                      <li>↳ CUSTOM POLICY → LESSON MAPPING</li>
                      <li>↳ SAML / SCIM / EU RESIDENCY (ROADMAP)</li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button asChild variant="primary" size="lg">
                      <Link href="/sign-up?intent=governance">START ENTERPRISE CONVERSATION →</Link>
                    </Button>
                    <Button asChild variant="secondary" size="lg">
                      <Link href="/pricing">SEE FULL PRICING</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </NumberedSection>
          </div>
        </section>

        {/* V. Security posture */}
        <section className="border-b border-ink-600 bg-ink-900">
          <div className="mx-auto max-w-content px-6 py-20 lg:px-8 lg:py-28">
            <NumberedSection numeral="V." eyebrow="SECURITY POSTURE" className="space-y-10">
              <h2 className="font-serif text-display-md italic text-paper-100">The honest list.</h2>
              <p className="max-w-reading text-body-lg text-paper-300">
                We&apos;d rather tell you what&apos;s shipped than what&apos;s on a slide. Status is
                refreshed against the live posture; gaps are listed because we&apos;d rather you ask
                the question now than during procurement.
              </p>
              <GovernanceSecurity />
            </NumberedSection>
          </div>
        </section>

        {/* VI. The brief */}
        <section className="bg-ink-900">
          <div className="mx-auto max-w-content px-6 py-20 lg:px-8 lg:py-28">
            <NumberedSection numeral="VI." eyebrow="THE BRIEF" className="space-y-8">
              <div className="rounded-md border border-signal-dim bg-ink-800 p-10 lg:p-14">
                <MonoLabel className="text-signal">CISO BRIEFING · 30 MINUTES</MonoLabel>
                <h2 className="mt-4 font-serif text-display-lg italic text-paper-100">
                  Show us your AI policy. We&apos;ll show you what you can prove next quarter.
                </h2>
                <p className="mt-6 max-w-reading text-body-lg text-paper-300">
                  No procurement. No deck. We connect a sandbox tenant in front of you, walk through
                  the dashboard with one of our security engineers, and leave you with a sample
                  evidence report from your real policy.
                </p>
                <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <Button asChild variant="primary" size="lg">
                    <Link href="/sign-up?intent=governance">REQUEST CISO BRIEFING →</Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <a
                      href="/governance/sample-report.pdf"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      VIEW SAMPLE REPORT
                    </a>
                  </Button>
                </div>
              </div>
            </NumberedSection>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
