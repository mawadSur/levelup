import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@levelup/ui';

export interface PlanCardFeature {
  label: string;
}

export interface PlanCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  /** Slot rendered inside CardFooter for the CTA (allows server/client flexibility) */
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
    <Card
      className={[
        'relative flex flex-col transition-shadow',
        highlight
          ? ['ring-2 ring-primary shadow-xl', 'lg:scale-[1.04] lg:-mt-4 lg:mb-4'].join(' ')
          : 'bg-card/60 shadow-sm',
      ].join(' ')}
    >
      {/* "Most popular" ribbon */}
      {highlight && (
        <div className="pointer-events-none absolute -top-px right-5 z-10">
          <span
            className={[
              'inline-block -rotate-3 rounded-sm bg-primary px-3 py-1',
              'font-display text-xs font-semibold tracking-wide text-primary-foreground',
              'shadow-md',
            ].join(' ')}
          >
            Most popular
          </span>
        </div>
      )}

      <CardHeader className={`pb-4 pt-8 ${highlight ? 'px-8' : 'px-6'}`}>
        <CardTitle className="text-xl">{name}</CardTitle>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight text-foreground">{price}</span>
          {period && <span className="text-sm text-muted-foreground">{period}</span>}
        </div>
        <CardDescription className="mt-2 text-sm">{description}</CardDescription>
      </CardHeader>

      <CardContent className={`flex-1 ${highlight ? 'px-8' : 'px-6'} pb-6`}>
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              >
                <path
                  d="M3 8l3.5 3.5L13 4.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className={`${highlight ? 'px-8' : 'px-6'} pb-8`}>{cta}</CardFooter>
    </Card>
  );
}
