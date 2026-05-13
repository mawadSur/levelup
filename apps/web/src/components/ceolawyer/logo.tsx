interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
}

export function CeoLawyerLogo({ className, variant = 'dark' }: LogoProps) {
  const wordFill = variant === 'light' ? '#FFFFFF' : 'rgb(var(--cl-navy))';
  const rule = variant === 'light' ? 'rgba(212, 162, 76, 0.95)' : 'rgb(var(--cl-gold))';

  return (
    <svg
      viewBox="0 0 200 44"
      role="img"
      aria-label="CEO Lawyer AI Academy"
      className={className}
      style={{ height: '1.75rem', width: 'auto' }}
    >
      <text
        x="0"
        y="24"
        fontFamily="var(--font-manrope), system-ui, sans-serif"
        fontWeight={800}
        fontSize="18"
        letterSpacing="0.06em"
        fill={wordFill}
      >
        CEO LAWYER
      </text>
      <rect x="0" y="30" width="118" height="3" fill={rule} rx="1.5" />
      <text
        x="0"
        y="42"
        fontFamily="var(--font-manrope), system-ui, sans-serif"
        fontWeight={500}
        fontSize="8"
        letterSpacing="0.18em"
        fill={wordFill}
        opacity={0.78}
      >
        AI ACADEMY
      </text>
    </svg>
  );
}
