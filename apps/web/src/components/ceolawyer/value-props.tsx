import { ShieldCheck, BookOpenCheck, FileSignature, Megaphone } from 'lucide-react';

const PROPS = [
  {
    icon: ShieldCheck,
    title: 'Confidentiality-safe AI',
    body: 'Client identifiers, case numbers, and protected health information are caught by the coach before they leave the browser. Built for firms handling sensitive client data.',
  },
  {
    icon: BookOpenCheck,
    title: 'Citation-checked legal research',
    body: 'Every research prompt routes through citation verification. Hallucinated case law gets flagged. Your associates learn the technique — not just the answer.',
  },
  {
    icon: FileSignature,
    title: 'Demand letters with human review',
    body: 'Templates tuned to your firm&rsquo;s tone, with mandatory review checkpoints before a draft ever touches a carrier or opposing counsel.',
  },
  {
    icon: Megaphone,
    title: 'Marketing that respects the rules',
    body: 'Brand-safe content prompts that follow your state bar&rsquo;s advertising rules. Coach blocks the use of real client outcomes without documented consent.',
  },
];

export function CeoLawyerValueProps() {
  return (
    <section
      id="value-props"
      className="scroll-mt-20 border-b border-cl-rule bg-cl-paper py-20 lg:py-24"
    >
      <div className="mx-auto max-w-cl-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-cl-reading">
          <p className="cl-eyebrow text-cl-navy">Fighting for outcomes</p>
          <h2 className="cl-h1 mt-3 text-cl-ink">
            AI that respects privilege as fiercely as your firm does.
          </h2>
          <p className="cl-body-lg mt-5 text-cl-ink-soft">
            Four guardrails that translate the way a personal injury firm already works into how AI
            gets used inside the building.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {PROPS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-cl-md border border-cl-rule bg-cl-paper p-6 transition-all duration-200 ease-cl-out hover:-translate-y-px hover:border-cl-rule-strong hover:shadow-cl-sm lg:p-8"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-cl-sm bg-cl-navy text-cl-gold">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <div className="flex-1">
                  <h3 className="cl-h3 text-cl-ink">{title}</h3>
                  <p
                    className="cl-body-sm mt-2 text-cl-ink-soft"
                    dangerouslySetInnerHTML={{ __html: body }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
