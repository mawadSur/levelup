import {
  Banknote,
  ClipboardCheck,
  HeartHandshake,
  ShieldCheck,
  Megaphone,
  Settings2,
} from 'lucide-react';

const ROLES = [
  {
    icon: Banknote,
    title: 'Lending agents',
    body: 'Faster proposals, safer customer comms. Coach flags applicant SSNs and FICO scores before they leave the browser.',
  },
  {
    icon: ClipboardCheck,
    title: 'Underwriters',
    body: 'Use AI to triage applications, summarize bank statements, and draft credit memos &mdash; without exposing borrower financials.',
  },
  {
    icon: HeartHandshake,
    title: 'Customer success',
    body: 'Better answers in less time. Trained on your tone, your products, and what counts as protected information.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance',
    body: 'Real-time visibility into AI usage by department. Evidence trails your CISO can hand to GLBA examiners.',
  },
  {
    icon: Megaphone,
    title: 'Marketing',
    body: 'Faster content production with brand-safe prompts. Coach blocks the use of customer data for ad copy.',
  },
  {
    icon: Settings2,
    title: 'Operations',
    body: 'Automate reporting, vendor questionnaires, and internal docs. AI literacy without compliance debt.',
  },
];

export function KapitusRoles() {
  return (
    <section
      id="roles"
      className="border-b border-kp-rule bg-kp-mist py-20 lg:py-24"
    >
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-kp-reading">
          <p className="kp-eyebrow text-kp-blue">By role</p>
          <h2 className="kp-h1 mt-3 text-kp-navy">
            Built for the roles you actually staff.
          </h2>
          <p className="kp-body-lg mt-5 text-kp-ink-soft">
            Eight role-based learning paths and fifty curated prompts. The
            curriculum maps cleanly to a Kapitus org chart.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-kp-md border border-kp-rule bg-kp-paper p-6 transition-all duration-200 ease-kp-out hover:-translate-y-px hover:border-kp-rule-strong hover:shadow-kp-sm lg:p-7"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-kp-sm bg-kp-blue-soft text-kp-navy">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <h3 className="kp-h3 mt-5 text-kp-navy">{title}</h3>
              <p
                className="kp-body-sm mt-2 text-kp-ink-soft"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
