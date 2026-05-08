import { MonoLabel } from '@levelup/ui';

export interface PlanCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  /** Slot rendered for the CTA (allows server/client flexibility) */
  cta: React.ReactNode;
  highlight?: boolean;
}

export function PlanCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  highlight = false,
}: PlanCardProps) {
  return (
    <div
      className={[
        'relative flex flex-col bg-ink-800 p-8',
        'border transition-colors duration-200 ease-mission',
        highlight ? 'border-signal lg:-mt-4 lg:mb-4' : 'border-ink-600 hover:border-signal-dim',
        // sharp tabular feel — keep radius minimal
        'rounded-sm',
      ].join(' ')}
    >
      {highlight && (
        <div className="absolute -top-px left-0 right-0 flex justify-center">
          <span className="-translate-y-1/2 bg-signal px-3 py-1 font-mono text-mono-sm uppercase tracking-[0.05em] text-ink-900">
            RECOMMENDED
          </span>
        </div>
      )}

      <div className="mb-6 flex items-baseline justify-between border-b border-ink-600 pb-5">
        <MonoLabel tone="signal">{name.toUpperCase()}</MonoLabel>
        <MonoLabel className="text-paper-500">PLAN</MonoLabel>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-display-md tabular-nums text-paper-100">{price}</span>
          {period && (
            <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              {period}
            </span>
          )}
        </div>
        <p className="mt-3 text-body-sm text-paper-300">{description}</p>
      </div>

      <ul className="mb-8 flex-1 space-y-3 border-t border-ink-600 pt-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-body-sm text-paper-100">
            <span
              className="mt-[2px] font-mono text-mono-sm uppercase tracking-[0.05em] text-signal"
              aria-hidden
            >
              +
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div>{cta}</div>
    </div>
  );
}
