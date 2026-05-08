'use client';

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '../lib/cn';

interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  decorated?: boolean;
}

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(
  (
    { className, orientation = 'horizontal', decorative = true, decorated = false, ...props },
    ref,
  ) => {
    if (decorated && orientation === 'horizontal') {
      return (
        <div
          className={cn('relative flex w-full items-center', className)}
          role={decorative ? undefined : 'separator'}
        >
          <span aria-hidden className="h-px flex-1 bg-ink-500" />
          <span
            aria-hidden
            className="px-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500 select-none"
          >
            +
          </span>
          <span aria-hidden className="h-px flex-1 bg-ink-500" />
        </div>
      );
    }
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          'shrink-0 bg-ink-500',
          orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
          className,
        )}
        {...props}
      />
    );
  },
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
