'use client';

import { cn } from '../lib/cn';

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('relative overflow-hidden rounded-sm bg-ink-700', className)} {...props}>
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0',
        'bg-gradient-to-r from-transparent via-ink-600 to-transparent',
        'animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]',
        'motion-reduce:hidden',
      )}
    />
  </div>
);

export { Skeleton };
