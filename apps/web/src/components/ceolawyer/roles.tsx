import { Phone, FileText, Megaphone, Briefcase, Scale } from 'lucide-react';

const ROLES = [
  {
    icon: Phone,
    title: 'Intake specialists',
    body: 'Faster, kinder first conversations. The coach helps you capture the right facts without exposing client identifiers to public AI tools.',
  },
  {
    icon: FileText,
    title: 'Paralegals',
    body: 'Draft demand letters, summarize medical records, and prep for depositions — with citation checks and a confidentiality net underneath every prompt.',
  },
  {
    icon: Megaphone,
    title: 'Marketing & SEO',
    body: 'Brand-safe content production that respects bar-association advertising rules. Coach blocks the use of real client stories without consent.',
  },
  {
    icon: Briefcase,
    title: 'Case managers',
    body: 'Status updates, scheduling, and follow-through that actually scale. Templates tuned to your firm&rsquo;s tone, not generic AI fluff.',
  },
  {
    icon: Scale,
    title: 'Junior attorneys',
    body: 'Legal research with citation verification, motion drafting with human-review checkpoints, and prompt techniques you&rsquo;ll use on every matter.',
  },
];

export function CeoLawyerRoles() {
  return (
    <section id="roles" className="border-b border-cl-rule bg-cl-surface py-20 lg:py-24">
      <div className="mx-auto max-w-cl-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-cl-reading">
          <p className="cl-eyebrow text-cl-navy">For your team</p>
          <h2 className="cl-h1 mt-3 text-cl-ink">
            Serving the people who help injured people win.
          </h2>
          <p className="cl-body-lg mt-5 text-cl-ink-soft">
            Five role-based learning paths, each shaped around the decisions your team makes every
            day. Same coach. Same guardrails. Different work.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-cl-md border border-cl-rule bg-cl-paper p-6 transition-all duration-200 ease-cl-out hover:-translate-y-px hover:border-cl-rule-strong hover:shadow-cl-sm lg:p-7"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-cl-sm bg-cl-cream text-cl-navy">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <h3 className="cl-h3 mt-5 text-cl-ink">{title}</h3>
              <p
                className="cl-body-sm mt-2 text-cl-ink-soft"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
