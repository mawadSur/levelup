import Link from 'next/link';
import { Check } from 'lucide-react';
import { clRoutes } from './routes';

const INCLUDED = [
  'Role-based curriculum — intake, paralegals, marketing, case managers, attorneys',
  'In-context AI coach with confidentiality and citation guardrails',
  'Firm-level progress + completion reporting',
  'Bar-aware marketing prompts and demand-letter templates',
  'Certificate of completion for every team member&rsquo;s file',
];

export function CeoLawyerPricingTeaser() {
  return (
    <section
      id="pricing"
      aria-labelledby="cl-pricing-heading"
      className="border-b border-cl-rule bg-cl-surface py-20 lg:py-24"
    >
      <div className="mx-auto max-w-cl-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-cl-reading">
          <p className="cl-eyebrow text-cl-navy">What you get</p>
          <h2 id="cl-pricing-heading" className="cl-h1 mt-3 text-cl-ink">
            One program. Every role at the firm.
          </h2>
          <p className="cl-body-lg mt-5 text-cl-ink-soft">
            Same curriculum, same coach, same evidence trail &mdash; whether you&rsquo;re at the
            front desk taking the first call or in the courtroom on a Monday morning.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-cl-lg border border-cl-rule bg-cl-paper shadow-cl-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            <div className="border-b border-cl-rule p-8 lg:border-b-0 lg:border-r lg:p-10">
              <p className="cl-eyebrow text-cl-gold-deep">Your first 30 days</p>
              <p className="cl-h2 mt-3 text-cl-ink">Start fast. Prove value before quarter end.</p>
              <p className="cl-body mt-4 text-cl-ink-soft">
                Most team members finish the AI Basics path inside two weeks with about 20 minutes a
                day. The role-specific path layers on after that. Managing partner sign-off is built
                in.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={clRoutes.signUp}
                  className="inline-flex items-center justify-center rounded-cl-sm bg-cl-navy px-6 py-3 text-base font-semibold text-white shadow-cl-sm transition-colors duration-200 ease-cl-out hover:bg-cl-navy-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cl-navy"
                >
                  Get started
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-cl-sm border border-cl-rule-strong bg-cl-paper px-6 py-3 text-base font-medium text-cl-ink transition-colors duration-200 ease-cl-out hover:bg-cl-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cl-navy"
                >
                  See full pricing
                </Link>
              </div>
            </div>

            <div className="bg-cl-cream p-8 lg:p-10">
              <p className="cl-eyebrow text-cl-navy">What&rsquo;s included</p>
              <ul className="mt-5 space-y-4">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-cl-pill bg-cl-navy text-cl-gold">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                    <span
                      className="cl-body text-cl-ink"
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
