'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-sm border border-ink-500 bg-transparent',
          'px-3 py-2 text-body-sm text-paper-100 font-sans',
          'placeholder:font-mono placeholder:text-paper-500 placeholder:text-mono-sm',
          'file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-paper-100',
          'transition-colors duration-150 ease-mission',
          'focus-visible:outline-none focus-visible:border-signal',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
