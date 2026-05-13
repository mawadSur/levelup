type Step = {
  n: string;
  eyebrow: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    n: '1',
    eyebrow: 'Week 1',
    title: 'Assess',
    body: 'Every team member takes a 5-minute baseline that maps their AI literacy AND their risk profile against your firm&rsquo;s confidentiality and advertising rules.',
  },
  {
    n: '2',
    eyebrow: 'Weeks 2–3',
    title: 'Train',
    body: 'Role-based curricula for intake, paralegals, marketing, case managers, and attorneys. Short lessons, an in-context coach, and citation checks built into every legal-research prompt.',
  },
  {
    n: '3',
    eyebrow: 'Week 4',
    title: 'Prove ROI',
    body: 'A firm dashboard your managing partner will actually open. Time saved per role, confidentiality triggers caught, training completion — the receipts you need to keep the program funded.',
  },
];

export function CeoLawyerHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-b border-cl-rule bg-cl-paper py-20 lg:py-24"
    >
      <div className="mx-auto max-w-cl-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-cl-reading">
          <p className="cl-eyebrow text-cl-navy">How it works</p>
          <h2 className="cl-h1 mt-3 text-cl-ink">
            Four weeks from blind spot to a program you can point at.
          </h2>
          <p className="cl-body-lg mt-5 text-cl-ink-soft">
            One product. Three phases. Each step produces an artifact your managing partner or your
            outside counsel can actually use.
          </p>
        </div>

        <div className="relative mt-14 grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
          <div
            aria-hidden
            className="absolute hidden h-px bg-cl-rule lg:block"
            style={{ top: '2rem', left: '16.6667%', right: '16.6667%' }}
          />
          {STEPS.map((s) => (
            <article key={s.n} className="relative flex flex-col lg:items-center lg:text-center">
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-cl-navy text-white shadow-cl-sm">
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: '1.5rem', lineHeight: 1 }}
                >
                  {s.n}
                </span>
              </div>
              <p className="cl-eyebrow mt-6 text-cl-gold-deep">{s.eyebrow}</p>
              <h3 className="cl-h3 mt-2 text-cl-ink">{s.title}</h3>
              <p
                className="cl-body mt-3 max-w-md text-cl-ink-soft"
                dangerouslySetInnerHTML={{ __html: s.body }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
