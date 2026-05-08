import { MonoLabel, NumberedSection } from '@levelup/ui';

const STEPS = [
  {
    number: '01',
    eyebrow: 'CALIBRATE',
    title: 'We assess every operator.',
    description:
      'A 15-minute adaptive baseline scores current AI literacy, flags the highest-risk non-users, and assigns a recommended level — Foundational, Practitioner, or Advanced — per person.',
    detail: [
      'Adaptive assessment, not a generic quiz',
      'Per-person level recommendation',
      'Identifies highest-risk non-users',
    ],
  },
  {
    number: '02',
    eyebrow: 'TRAIN',
    title: 'We brief them by role.',
    description:
      'AI Basics first. Then a role-specific path — Sales, Marketing, Support, HR, Finance, Managers, Executives, Engineering — with content matched to how that role actually uses AI.',
    detail: [
      'Eight role-specific learning paths',
      'Short lessons engineered for busy schedules',
      'Built-in quizzes and real exercises',
    ],
  },
  {
    number: '03',
    eyebrow: 'MEASURE',
    title: 'You see what changed.',
    description:
      'Admins get a live dashboard with department heatmaps, completion percentages, quiz scores, risk flags, and certificate issuance. Plain enough for a board update, exportable to your BI stack.',
    detail: [
      'Department completion heatmap',
      'Risk flag reports for non-compliant usage',
      'CSV export for your own BI tools',
    ],
  },
];

export function HowItWorks() {
  return (
    <div
      id="how-it-works"
      className="scroll-mt-16 border-b border-ink-600 bg-ink-900 py-24 lg:py-32"
    >
      <div className="mx-auto max-w-content px-6 lg:px-8">
        <NumberedSection numeral="II." eyebrow="THE INSTRUMENT">
          <div className="mb-16 max-w-reading">
            <h2 className="font-serif text-display-lg text-paper-100">
              Three steps. Thirty days. <em className="italic text-paper-300">No IT project.</em>
            </h2>
            <p className="mt-6 text-body-lg text-paper-300">
              Baseline to measurable improvement in a single sprint. No learning management system
              migration, no RFP cycle, no procurement labyrinth.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-ink-600 bg-ink-600 lg:grid-cols-3">
            {STEPS.map(({ number, eyebrow, title, description, detail }) => (
              <div
                key={number}
                className="flex flex-col bg-ink-800 p-8 transition-colors duration-200 ease-mission hover:bg-ink-700"
              >
                <div className="mb-8 flex items-baseline justify-between">
                  <span className="font-serif text-display-lg leading-none text-signal">
                    {number}
                  </span>
                  <MonoLabel tone="signal">{eyebrow}</MonoLabel>
                </div>
                <h3 className="font-sans text-h2 font-medium text-paper-100">{title}</h3>
                <p className="mt-4 flex-1 text-body-sm text-paper-300">{description}</p>
                <ul className="mt-6 space-y-2 border-t border-ink-600 pt-5">
                  {detail.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300"
                    >
                      <span className="text-signal" aria-hidden>
                        +
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </NumberedSection>
      </div>
    </div>
  );
}
