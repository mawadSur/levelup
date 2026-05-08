'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-sans font-medium text-body-sm',
    'rounded-sm',
    'transition-colors duration-150 ease-mission',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    'motion-reduce:transition-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: ['bg-signal text-ink-900', 'hover:bg-paper-100 hover:text-ink-900'].join(' '),
        secondary: ['bg-transparent border border-ink-500 text-paper-100', 'hover:bg-ink-700'].join(
          ' ',
        ),
        ghost: ['bg-transparent text-paper-100', 'hover:bg-ink-700'].join(' '),
        danger: ['bg-danger text-paper-100', 'hover:bg-danger/90'].join(' '),
        // Back-compat aliases — keep callers from breaking until migrated.
        default: ['bg-signal text-ink-900', 'hover:bg-paper-100 hover:text-ink-900'].join(' '),
        destructive: ['bg-danger text-paper-100', 'hover:bg-danger/90'].join(' '),
        outline: ['bg-transparent border border-ink-500 text-paper-100', 'hover:bg-ink-700'].join(
          ' ',
        ),
        link: 'bg-transparent text-signal hover:underline underline-offset-4',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-body-sm',
        lg: 'h-11 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
