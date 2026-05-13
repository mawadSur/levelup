import { Lock, FileCheck, ScrollText } from 'lucide-react';

const POINTS = [
  {
    icon: Lock,
    label: 'Built for firms handling sensitive client data',
    body: 'Tenant data isolation, encrypted at rest and in transit, dev access scoped and logged.',
  },
  {
    icon: FileCheck,
    label: 'Bar-association-aware advertising guardrails',
    body: 'Marketing prompts respect state rules on client testimonials, outcomes, and solicitation.',
  },
  {
    icon: ScrollText,
    label: 'Audit-ready evidence — without the auditor in the room',
    body: 'Quarterly training reports that prove who trained on what, and what the coach caught.',
  },
];

export function CeoLawyerTrustStrip() {
  return (
    <section id="trust" className="border-b border-cl-rule bg-cl-cream py-16 lg:py-20">
      <div className="mx-auto max-w-cl-container px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr] lg:items-start lg:gap-16">
          <div>
            <p className="cl-eyebrow text-cl-navy">Trusted by the firm, for the firm</p>
            <h2 className="cl-h2 mt-3 text-cl-ink">
              No risk to your team&rsquo;s productivity. No surprises with the bar.
            </h2>
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {POINTS.map(({ icon: Icon, label, body }) => (
              <li
                key={label}
                className="flex flex-col gap-3 rounded-cl-md border border-cl-rule bg-cl-paper p-5"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-cl-sm bg-cl-navy text-cl-gold">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className="cl-body-sm font-semibold text-cl-ink">{label}</p>
                <p className="cl-body-sm text-cl-ink-soft">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
