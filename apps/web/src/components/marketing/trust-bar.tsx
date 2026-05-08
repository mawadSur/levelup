import { MonoLabel } from '@levelup/ui';

const LOGOS = ['ACME CO', 'NORTHWIND', 'RIVERSTONE HEALTH', 'COHORT CAPITAL', 'HELIX INSURANCE'];

export function TrustBar() {
  return (
    <section className="border-b border-ink-600 bg-ink-900">
      <div className="mx-auto max-w-content px-6 py-12 lg:px-8">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:gap-10">
          <MonoLabel className="shrink-0 text-paper-500">FIELDED WITH HR · IT · L&D AT</MonoLabel>
          <div className="flex flex-1 flex-wrap items-baseline gap-x-10 gap-y-3">
            {LOGOS.map((name) => (
              <span
                key={name}
                className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
