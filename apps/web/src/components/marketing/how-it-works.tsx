'use client';

import { ScrollReveal } from '@/lib/motion/scroll-reveal';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';

const STEPS = [
  {
    number: '01',
    title: 'We assess your team',
    description:
      'Every employee completes a 15-minute baseline assessment. We score their current AI literacy, flag gaps, and assign a recommended level — Foundational, Practitioner, or Advanced — per person.',
    detail: [
      'Adaptive assessment, not a generic quiz',
      'Per-person level recommendation',
      'Identifies your highest-risk non-users',
    ],
  },
  {
    number: '02',
    title: 'We train them by role',
    description:
      'Everyone gets AI Basics first. Then a role-specific path: Sales, Marketing, Support, HR, Finance, Managers, Executives, or Engineering. Content is specific to how that role actually uses AI.',
    detail: [
      '8 role-specific learning paths',
      'Short lessons designed for busy schedules',
      'Built-in quizzes and real exercises',
    ],
  },
  {
    number: '03',
    title: 'You see what changed',
    description:
      'Admins get a live dashboard with department-level heatmaps, completion percentages, quiz scores, risk flags, and certificate issuance. The data is exportable and plain enough for a board update.',
    detail: [
      'Department completion heatmap',
      'Risk flag reports for non-compliant usage',
      'CSV export for your own BI tools',
    ],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-muted/20 scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From baseline to measurable improvement in 30 days. No IT project. No learning
            management system migration.
          </p>
        </ScrollReveal>

        <div className="relative">
          {/* Connecting line — desktop only */}
          <div
            aria-hidden="true"
            className="absolute top-10 left-0 right-0 hidden h-px bg-border lg:block"
            style={{ marginLeft: '5rem', marginRight: '5rem' }}
          />

          <Stagger className="grid gap-10 sm:gap-8 lg:grid-cols-3">
            {STEPS.map(({ number, title, description, detail }) => (
              <ScrollItem key={number}>
                <div className="relative flex flex-col">
                  {/* Step number badge */}
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-indigo-600 bg-background text-sm font-bold text-indigo-600 lg:self-start">
                    {number}
                  </div>

                  <h3 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
                    {title}
                  </h3>
                  <p className="mb-5 text-base leading-relaxed text-muted-foreground flex-1">
                    {description}
                  </p>
                  <ul className="space-y-2">
                    {detail.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          className="mt-0.5 shrink-0 text-indigo-600"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 8l3.5 3.5L13 4.5"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
