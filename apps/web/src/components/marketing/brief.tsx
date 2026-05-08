import { MonoLabel, NumberedSection } from '@levelup/ui';

const POSITIONS = [
  {
    code: 'P-01',
    label: 'THE GAP',
    body: 'Most enterprise AI training is generic, classroom-shaped, and divorced from the real work. Your operators want answers in the flow, not certificates filed away.',
  },
  {
    code: 'P-02',
    label: 'THE ANSWER',
    body: 'A role-shaped curriculum, an in-context coach trained on your policy, and an admin instrument that turns activity into evidence.',
  },
  {
    code: 'P-03',
    label: 'THE PROOF',
    body: 'Pilot in thirty days. Measurable improvement by week three. Department heatmaps and risk flags your CIO will actually open.',
  },
];

export function Brief() {
  return (
    <div className="border-b border-ink-600 bg-ink-900 py-24 lg:py-32">
      <div className="mx-auto max-w-content px-6 lg:px-8">
        <NumberedSection numeral="I." eyebrow="THE BRIEF">
          <div className="grid gap-12 lg:grid-cols-[5fr,7fr]">
            <div>
              <h2 className="font-serif text-display-lg text-paper-100">
                AI fluency is now an <em className="italic text-signal">operating</em> requirement.
              </h2>
              <p className="mt-6 text-body-lg text-paper-300">
                Three positions on what enterprise AI training has to be in 2026 — and the things we
                refuse to ship.
              </p>
            </div>

            <div className="space-y-px overflow-hidden rounded-md border border-ink-600 bg-ink-600">
              {POSITIONS.map((p) => (
                <div
                  key={p.code}
                  className="grid gap-6 bg-ink-800 p-6 sm:grid-cols-[1fr,3fr] sm:p-8"
                >
                  <div>
                    <MonoLabel tone="signal">{p.code}</MonoLabel>
                    <p className="mt-2 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                      {p.label}
                    </p>
                  </div>
                  <p className="text-body-lg text-paper-100">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </NumberedSection>
      </div>
    </div>
  );
}
