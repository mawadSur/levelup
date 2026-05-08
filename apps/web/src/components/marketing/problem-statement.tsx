import { MissionNumber, MonoLabel, NumberedSection } from '@levelup/ui';

const STATS = [
  {
    value: 0.73,
    format: 'percent' as const,
    label: 'of employees use AI tools at work every week.',
    detail:
      'From draft emails to data summaries, AI has already entered the workflow — with or without HR approval.',
    tone: 'default' as const,
  },
  {
    value: 0.12,
    format: 'percent' as const,
    label: 'have ever received any structured AI training.',
    detail:
      'Most learned by trial and error, copying prompts from Reddit, or watching a YouTube video once.',
    tone: 'signal' as const,
  },
  {
    value: 0,
    format: 'percent' as const,
    label: 'of leaders know which 12% those are.',
    detail:
      'There is no visibility into who is using AI well, who is guessing, and who is quietly pasting customer data into public models.',
    tone: 'danger' as const,
  },
];

export function ProblemStatement() {
  return (
    <div className="border-b border-ink-600 bg-ink-900 py-24 lg:py-32">
      <div className="mx-auto max-w-content px-6 lg:px-8">
        <NumberedSection numeral="III." eyebrow="THE EVIDENCE">
          <div className="grid gap-12 lg:grid-cols-[5fr,7fr]">
            <div>
              <h2 className="font-serif text-display-lg text-paper-100">
                Your team is already using AI.
                <br />
                <em className="italic text-signal">Most are guessing.</em>
              </h2>
              <p className="mt-6 max-w-md text-body-lg text-paper-300">
                The gap between AI enthusiasm and AI capability is real — and it is widening. Here
                is what the numbers actually say.
              </p>
            </div>

            <div className="grid grid-cols-1 divide-y divide-ink-600 border-y border-ink-600 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {STATS.map(({ value, format, label, detail, tone }, i) => (
                <div key={label} className="px-2 py-8 first:pl-0 last:pr-0 sm:px-6 sm:py-2">
                  <MonoLabel className="mb-3 text-paper-500">[0{i + 1}] FIGURE</MonoLabel>
                  <p
                    className={[
                      'font-serif text-display-lg leading-none',
                      tone === 'signal' && 'text-signal',
                      tone === 'danger' && 'text-danger',
                      tone === 'default' && 'text-paper-100',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <MissionNumber value={value} format={format} />
                  </p>
                  <p className="mt-4 text-body-sm text-paper-100">{label}</p>
                  <p className="mt-3 text-body-sm text-paper-300">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </NumberedSection>
      </div>
    </div>
  );
}
