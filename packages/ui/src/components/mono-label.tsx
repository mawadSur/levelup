'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

type MonoLabelTone = 'default' | 'signal' | 'success' | 'danger';

export interface MonoLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: MonoLabelTone;
}

const toneClass: Record<MonoLabelTone, string> = {
  default: 'text-paper-300',
  signal: 'text-signal',
  success: 'text-success',
  danger: 'text-danger',
};

const MonoLabel = React.forwardRef<HTMLSpanElement, MonoLabelProps>(
  ({ className, tone = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-block font-mono uppercase text-mono-sm tracking-[0.05em]',
        toneClass[tone],
        className,
      )}
      {...props}
    />
  ),
);
MonoLabel.displayName = 'MonoLabel';

export { MonoLabel };
