'use client';

import { cn } from '../lib/cn';

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-md bg-muted',
      'before:absolute before:inset-0 before:-translate-x-full',
      'before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.04] before:to-transparent',
      'before:animate-[ink-blot_2.4s_ease-in-out_infinite]',
      'motion-reduce:before:animate-none',
      className,
    )}
    {...props}
  />
);

export { Skeleton };
