import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
  const monogramSize = size === 'sm' ? 28 : 36;
  const wordmarkClass = size === 'sm' ? 'text-lg' : 'text-2xl';

  return (
    <span className={cn('inline-flex items-baseline gap-2.5', className)}>
      <svg
        width={monogramSize}
        height={monogramSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="self-center"
      >
        <rect width="36" height="36" rx="4" className="fill-signal" />
        <text
          x="50%"
          y="56%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-geist-mono), ui-monospace, monospace"
          fontSize="14"
          fontWeight="500"
          letterSpacing="0.5"
          className="fill-ink-900"
        >
          LU
        </text>
      </svg>
      <span className={cn('font-serif italic leading-none text-paper-100', wordmarkClass)}>
        ailevel
      </span>
    </span>
  );
}
