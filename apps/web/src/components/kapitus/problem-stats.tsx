const STATS = [
  {
    figure: '77%',
    body: 'of employees have pasted sensitive customer information into a public AI tool.',
    citation: {
      label: 'eSecurityPlanet',
      href: 'https://www.esecurityplanet.com/threats/ai-data-exposure-statistics/',
    },
  },
  {
    figure: '$50K+',
    body: 'average annual cost of an AI-DLP browser tool that employees route around.',
  },
  {
    figure: '30 days',
    body: 'to roll out LevelUp + close the loop on AI usage at your firm.',
  },
];

export function KapitusProblemStats() {
  return (
    <section
      id="problem"
      className="border-b border-kp-rule bg-kp-mist py-20 lg:py-24"
    >
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-kp-reading">
          <p className="kp-eyebrow text-kp-blue">The exposure</p>
          <h2 className="kp-h1 mt-3 text-kp-navy">
            The exposure your training program is supposed to prevent.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STATS.map((s) => (
            <article
              key={s.figure}
              className="rounded-kp-md border border-kp-rule bg-kp-paper p-8 transition-all duration-200 ease-kp-out hover:-translate-y-px hover:border-kp-rule-strong hover:shadow-kp-sm"
            >
              <p className="kp-display text-kp-navy">{s.figure}</p>
              <p className="kp-body mt-4 text-kp-ink-soft">{s.body}</p>
              {s.citation && (
                <p className="kp-body-sm mt-4 text-kp-ink-mute">
                  Source:{' '}
                  <a
                    href={s.citation.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-kp-blue underline-offset-2 hover:underline"
                  >
                    {s.citation.label}
                  </a>
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
