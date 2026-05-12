'use client';

import Link from 'next/link';

interface ProgressHeaderProps {
  current: number;
  total: number;
  /** Estimated minutes remaining — rendered when supplied. */
  estimatedMinutesRemaining?: number;
  pauseHref?: string;
}

export function ProgressHeader({
  current,
  total,
  estimatedMinutesRemaining,
  pauseHref = '/learn',
}: ProgressHeaderProps) {
  const safeTotal = total > 0 ? total : 1;
  const value = Math.min(100, Math.round((current / safeTotal) * 100));
  const cur = Math.min(current, total);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between font-mono text-mono-sm uppercase tracking-[0.05em]">
        <span className="text-paper-100">
          QUESTION {String(cur).padStart(2, '0')} / {String(total).padStart(2, '0')}
          {typeof estimatedMinutesRemaining === 'number' && estimatedMinutesRemaining > 0 && (
            <span className="text-paper-500"> · ~{estimatedMinutesRemaining} MIN REMAINING</span>
          )}
        </span>
        <Link
          href={pauseHref}
          className="text-paper-500 transition-colors hover:text-paper-100 hover:underline"
        >
          PAUSE
        </Link>
      </div>
      <div className="h-1 overflow-hidden rounded-data bg-ink-700">
        <div
          className="h-full bg-signal transition-[width] duration-500 ease-mission"
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-label="Assessment progress"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
