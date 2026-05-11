type Citation = {
  label: string;
  href: string;
};

type Stat = {
  figure: string;
  label: string;
  caption: string;
  citation?: Citation;
};

const STATS: Stat[] = [
  {
    figure: '73%',
    label: 'of breaches involve human error',
    caption:
      'Misuse, misdelivery, and pasted-credential mistakes — the failure modes a training program is supposed to close.',
    citation: {
      label: 'Verizon DBIR',
      href: 'https://www.verizon.com/business/resources/reports/dbir/',
    },
  },
  {
    figure: '$4.5M',
    label: 'average cost of a breach in financial services',
    caption:
      'Financial services pays the second-highest per-incident cost of any industry. Most of that is regulatory and notification overhead — not the breach itself.',
    citation: {
      label: 'IBM Cost of a Data Breach',
      href: 'https://www.ibm.com/reports/data-breach',
    },
  },
  {
    figure: '11 mo.',
    label: 'median dwell time before policy violations surface',
    caption:
      'Without an in-context coach, sensitive-data leaks into AI tools go unnoticed for almost a year — long after the data has left the building.',
  },
];

export function KapitusProblemStats() {
  return (
    <section id="problem" className="border-b border-kp-rule bg-kp-mist py-20 lg:py-24">
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-kp-reading">
          <p className="kp-eyebrow text-kp-purple">The exposure</p>
          <h2 className="kp-h1 mt-3 text-kp-ink">
            The exposure your training program is supposed to prevent.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STATS.map((s) => (
            <article
              key={s.figure}
              className="rounded-kp-md border border-kp-rule bg-kp-paper p-6 transition-all duration-200 ease-kp-out hover:-translate-y-px hover:border-kp-rule-strong hover:shadow-kp-sm lg:p-8"
            >
              <p
                className="kp-data text-kp-purple"
                style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', lineHeight: 1 }}
              >
                {s.figure}
              </p>
              <p className="kp-h3 mt-5 text-kp-ink">{s.label}</p>
              <p className="kp-body-sm mt-3 text-kp-ink-soft">{s.caption}</p>
              {s.citation && (
                <p className="kp-body-sm mt-4 text-kp-ink-mute">
                  Source:{' '}
                  <a
                    href={s.citation.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-kp-purple underline-offset-2 hover:underline"
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
