import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
  const monogramSize = size === 'sm' ? 28 : 36;
  const wordmarkClass = size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        width={monogramSize}
        height={monogramSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="36" height="36" rx="9" fill="hsl(347 60% 27%)" />
        <text
          x="5"
          y="26"
          fontFamily="var(--font-display), ui-serif, Georgia, serif"
          fontSize="17"
          fontWeight="600"
          fill="hsl(36 33% 96%)"
          letterSpacing="-0.5"
        >
          LU
        </text>
      </svg>
      <span
        className={cn('font-display font-semibold tracking-tight text-foreground', wordmarkClass)}
        style={{ letterSpacing: '-0.02em' }}
      >
        LevelUp
      </span>
    </span>
  );
}
