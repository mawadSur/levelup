'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface GridLinesProps extends React.HTMLAttributes<HTMLDivElement> {
  dense?: boolean;
}

const GridLines = React.forwardRef<HTMLDivElement, GridLinesProps>(
  ({ className, dense = false, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0',
        dense ? 'bg-blueprint-dense' : 'bg-blueprint',
        className,
      )}
      {...props}
    />
  ),
);
GridLines.displayName = 'GridLines';

export { GridLines };
