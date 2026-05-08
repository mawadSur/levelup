const STEPS = [
  {
    n: '1',
    title: 'Assess',
    body: 'Every Kapitus employee takes a 5-minute baseline that maps their AI literacy AND their risk profile against your acceptable-use policy.',
  },
  {
    n: '2',
    title: 'Train',
    body: 'Role-based curricula for lenders, underwriters, customer success, compliance, and operations. Eight learning paths, fifty curated prompts, an in-context coach that flags sensitive data BEFORE it leaves the browser.',
  },
  {
    n: '3',
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
          <p className="kp-eyebrow text-kp-blue">How it works</p>
          <h2 className="kp-h1 mt-3 text-kp-navy">
            A 30-day path from blind spot to board-ready evidence.
          </h2>
          <p className="kp-body-lg mt-5 text-kp-ink-soft">
            One product, three phases. Each step produces an artifact your CISO,
            CFO, or auditor can actually use.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {STEPS.map((s) => (
            <article
              key={s.n}
              className="rounded-kp-md border border-kp-rule bg-kp-paper p-8 transition-all duration-200 ease-kp-out hover:-translate-y-px hover:border-kp-rule-strong hover:shadow-kp-sm"
            >
              <span
                className="font-bold tabular-nums text-kp-navy"
                style={{ fontSize: '3.25rem', lineHeight: 1 }}
              >
                {s.n}
              </span>
              <h3 className="kp-h2 mt-5 text-kp-navy">{s.title}</h3>
              <p className="kp-body mt-4 text-kp-ink-soft">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
