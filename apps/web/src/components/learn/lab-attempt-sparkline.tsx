import { cn } from '@levelup/ui';

interface SparklinePoint {
  score: number;
  passed: boolean;
}

interface LabAttemptSparklineProps {
  attempts: SparklinePoint[];
  width?: number;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

export function LabAttemptSparkline({
  attempts,
  width = 120,
  height = 28,
  className,
  ariaLabel,
}: LabAttemptSparklineProps) {
  if (attempts.length === 0) return null;

  const padX = 4;
  const padY = 3;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const n = attempts.length;
  const xFor = (i: number) => (n === 1 ? width / 2 : padX + (i / (n - 1)) * innerW);
  const yFor = (score: number) => padY + (1 - clamp01(score)) * innerH;

  const linePath =
    n === 1
      ? ''
      : attempts
          .map((a, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)} ${yFor(a.score).toFixed(2)}`)
          .join(' ');

  const latest = attempts[n - 1];
  const latestPct = latest ? Math.round(latest.score * 100) : 0;
  const label = ariaLabel ?? `${n} attempt${n === 1 ? '' : 's'}, latest score ${latestPct}%`;

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('block', className)}
    >
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-paper-500"
          opacity={0.7}
        />
      )}
      {attempts.map((a, i) => (
        <circle
          key={i}
          cx={xFor(i)}
          cy={yFor(a.score)}
          r={i === n - 1 ? 2.75 : 2}
          className={a.passed ? 'fill-signal' : 'fill-rose-400'}
        />
      ))}
    </svg>
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
