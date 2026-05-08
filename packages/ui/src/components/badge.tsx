'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const badgeVariants = cva(
  [
    'inline-flex items-center font-mono uppercase',
    'text-mono-sm tracking-[0.05em]',
    'border bg-transparent rounded-data px-2 py-[2px]',
    'transition-colors duration-150 ease-mission',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-ink-500 text-paper-100',
        signal: 'border-signal-dim text-signal',
        success: 'border-success text-success',
        danger: 'border-danger text-danger',
        // Back-compat aliases.
        secondary: 'border-ink-500 text-paper-300',
        destructive: 'border-danger text-danger',
        outline: 'border-ink-500 text-paper-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
