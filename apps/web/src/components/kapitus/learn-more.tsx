import Link from 'next/link';
import { ArrowRight, GraduationCap, Sparkles, Trophy } from 'lucide-react';
import { kRoutes } from './routes';

const TIERS = [
  {
    eyebrow: 'Tier 01 · Apprentice',
    title: 'Start where you are.',
    body: 'AI Basics, the Kapitus data classes, GLBA in plain English, and your first safe prompt. About two weeks at 20 minutes a day.',
    bullets: ['AI Basics', 'Foundations at Kapitus'],
    Icon: Sparkles,
  },
  {
    eyebrow: 'Tier 02 · Practitioner',
    title: 'Use AI in your real work.',
    body: 'Six role electives: lending, underwriting, compliance, customer comms, sales, support. Built around the actual decisions you make at Kapitus.',
    bullets: [
      'AI for Lending',
      'AI for Underwriting',
      'AI for Compliance',
      'AI for Customer Comms',
    ],
    Icon: GraduationCap,
  },
  {
    eyebrow: 'Tier 03 · Specialist',
    title: 'Get serious about prompts.',
    body: 'The real techniques — few-shot examples, chain-of-thought reasoning, structured outputs, refinement loops. Move from "AI user" to "AI builder."',
    bullets: ['Prompt Engineering', 'More tracks coming'],
    Icon: Trophy,
  },
];

export function KapitusLearnMore() {
  return (
    <section
      id="curriculum-preview"
      aria-labelledby="curriculum-preview-heading"
      className="border-b border-kp-rule bg-kp-paper py-20 lg:py-24"
    >
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <p className="kp-eyebrow text-kp-purple">The curriculum</p>
            <h2 id="curriculum-preview-heading" className="kp-h1 mt-3 text-kp-ink">
              From zero to AI hero, at your own pace.
            </h2>
            <p className="kp-body mt-5 text-kp-ink-soft">
              Three tiers. One path through them. Every Kapitus employee starts as an Apprentice and
              walks the same journey — picking up the role-specific track that fits their day-to-day
              along the way.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href={kRoutes.signUp}
                className="inline-flex items-center justify-center gap-2 rounded-kp-sm bg-kp-purple-deep px-6 py-3 text-base font-semibold text-white shadow-kp-sm transition-colors duration-200 ease-kp-out hover:bg-kp-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple"
              >
                Start Your First Lesson
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Link>
              <Link
                href={kRoutes.signIn}
                className="inline-flex items-center justify-center gap-2 rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-6 py-3 text-base font-medium text-kp-ink transition-colors duration-200 ease-kp-out hover:bg-kp-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple"
              >
                Already Enrolled? Sign In
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {TIERS.map(({ eyebrow, title, body, bullets, Icon }) => (
              <article
                key={eyebrow}
                className="rounded-kp-md border border-kp-rule bg-kp-paper p-6 transition-all duration-200 ease-kp-out hover:-translate-y-px hover:border-kp-rule-strong hover:shadow-kp-sm lg:p-8"
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-kp-pill bg-kp-purple/10 text-kp-purple"
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div className="flex-1">
                    <p className="kp-eyebrow text-kp-purple">{eyebrow}</p>
                    <h3 className="kp-h3 mt-2 text-kp-ink">{title}</h3>
                    <p className="kp-body-sm mt-3 text-kp-ink-soft">{body}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {bullets.map((b) => (
                        <li
                          key={b}
                          className="kp-body-sm rounded-kp-pill border border-kp-rule bg-kp-mist px-3 py-1 text-kp-ink-soft"
                        >
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
