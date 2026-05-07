'use client';

import { Card, CardContent } from '@levelup/ui';
import { ScrollReveal } from '@/lib/motion/scroll-reveal';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';

// Inline SVG icons to avoid external dependencies
function IconPath() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M7 8h8M7 11h5M7 14h3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconCoach() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
function IconPolicy() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M11 2L4 5v6c0 4.4 3 8.1 7 9 4-0.9 7-4.6 7-9V5l-7-3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M8 11l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconGuardrail() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M7 8V6a4 4 0 018 0v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="11" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconReport() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M6 15l3-4 3 2 4-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconCert() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="9" r="5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M7 14l-1 6 5-2 5 2-1-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FEATURES = [
  {
    Icon: IconPath,
    title: 'Role-based learning paths',
    description:
      'Eight purpose-built paths for Sales, Marketing, Support, HR, Finance, Managers, Execs, and Engineering. Each one covers the tools and workflows that role actually uses.',
  },
  {
    Icon: IconCoach,
    title: 'Built-in AI coach',
    description:
      'Employees can ask the coach to review their prompts, explain a concept, or suggest a better approach — in context, without leaving the platform.',
  },
  {
    Icon: IconPolicy,
    title: 'Company policy upload',
    description:
      'Upload your AI acceptable-use policy as a PDF or plain text. The coach references it in every session, so employees always get guidance that reflects your rules, not generic advice.',
  },
  {
    Icon: IconGuardrail,
    title: 'Sensitive-data guardrails',
    description:
      'Automatic detection of PII, financial data, and confidential patterns in coach inputs. Employees see a warning before sending; admins see a flag in the risk report.',
  },
  {
    Icon: IconReport,
    title: 'Department reporting',
    description:
      'A live heatmap shows completion and scores by department and role. Filter by team, date range, or AI level. Export to CSV for your own tools.',
  },
  {
    Icon: IconCert,
    title: 'Certificates and badges',
    description:
      'Employees earn a verifiable certificate on completion of each path. Badges are shareable on LinkedIn. Certificates are stored and auditable.',
  },
];

export function FeatureGrid() {
  return (
    <section className="py-20 sm:py-28 bg-background" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything in one place
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No stitching together a course platform, an LMS, a policy wiki, and a reporting tool. It
            all ships together.
          </p>
        </ScrollReveal>

        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, description }) => (
            <ScrollItem key={title}>
              <Card className="group transition-shadow duration-200 hover:shadow-md">
                <CardContent className="pt-7 pb-7 px-7">
                  <div className="mb-4 text-indigo-600">
                    <Icon />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            </ScrollItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
