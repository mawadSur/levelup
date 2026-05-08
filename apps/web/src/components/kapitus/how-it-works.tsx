type Step = {
  n: string;
  eyebrow: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    n: '1',
    eyebrow: 'Day 1–3',
    title: 'Assess',
    body: 'Every Kapitus employee takes a 5-minute baseline that maps their AI literacy AND their risk profile against your acceptable-use policy.',
  },
  {
    n: '2',
    eyebrow: 'Day 4–21',
    title: 'Train',
    body: 'Role-based curricula for lenders, underwriters, customer success, compliance, and operations. Eight learning paths, fifty curated prompts, an in-context coach that flags sensitive data BEFORE it leaves the browser.',
  },
  {
    n: '3',
    eyebrow: 'Day 22–30',
    title: 'Prove',
    body: 'Quarterly governance reports your CISO can hand to auditors. Department-level risk scores, training completion, sensitive-data trigger trends. Board-ready by week three.',
  },
];

export function KapitusHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-b border-kp-rule bg-kp-paper py-20 lg:py-24"
    >
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-kp-reading">
          <p className="kp-eyebrow text-kp-purple">How it works</p>
          <h2 className="kp-h1 mt-3 text-kp-ink">
            A 30-day path from blind spot to board-ready evidence.
          </h2>
          <p className="kp-body-lg mt-5 text-kp-ink-soft">
            One product, three phases. Each step produces an artifact your CISO, CFO, or auditor can
            actually use.
          </p>
        </div>

        <div className="relative mt-14 grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
          <div
            aria-hidden
            className="absolute hidden h-px bg-kp-rule lg:block"
            style={{ top: '2rem', left: '16.6667%', right: '16.6667%' }}
          />
          {STEPS.map((s) => (
            <article key={s.n} className="relative flex flex-col lg:items-center lg:text-center">
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-kp-purple text-white shadow-kp-sm">
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: '1.5rem', lineHeight: 1 }}
                >
                  {s.n}
                </span>
              </div>
              <p className="kp-eyebrow mt-6 text-kp-purple">{s.eyebrow}</p>
              <h3 className="kp-h3 mt-2 text-kp-ink">{s.title}</h3>
              <p className="kp-body mt-3 max-w-md text-kp-ink-soft">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
