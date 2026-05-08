'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-sm border border-ink-500 bg-transparent',
          'px-3 py-2 text-body-sm text-paper-100 font-sans',
          'placeholder:font-mono placeholder:text-paper-500 placeholder:text-mono-sm',
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
Textarea.displayName = 'Textarea';

export { Textarea };
