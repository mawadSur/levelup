'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface NumberedSectionProps extends React.HTMLAttributes<HTMLElement> {
  numeral: string;
  eyebrow?: string;
}

const NumberedSection = React.forwardRef<HTMLElement, NumberedSectionProps>(
  ({ numeral, eyebrow, className, children, ...props }, ref) => {
    return (
      <section ref={ref} className={cn('relative', className)} {...props}>
        <div className="mb-8 flex items-baseline gap-3 font-mono text-mono uppercase tracking-[0.05em] text-paper-500">
          <span className="text-paper-300">{numeral}</span>
          {eyebrow ? <span>{eyebrow}</span> : null}
        </div>
        {children}
      </section>
    );
  },
);
NumberedSection.displayName = 'NumberedSection';

export { NumberedSection };
