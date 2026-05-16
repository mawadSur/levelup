'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface NumberedSectionProps extends React.HTMLAttributes<HTMLElement> {
  numeral: string;
  eyebrow?: string;
  /**
   * Heading level for the eyebrow/title. Defaults to `'h2'` since these
   * sections are typically top-level groupings under a page `<h1>`. Use
   * `'h3'` (or deeper) when nesting a NumberedSection inside another
   * section to preserve a valid document outline.
   *
   * Note: the visual treatment (mono, uppercase, tracking) is preserved
   * regardless of the rendered element — only the semantic level changes.
   */
  as?: 'h2' | 'h3' | 'h4';
}

const NumberedSection = React.forwardRef<HTMLElement, NumberedSectionProps>(
  ({ numeral, eyebrow, as = 'h2', className, children, ...props }, ref) => {
    const Heading = as;
    return (
      <section ref={ref} className={cn('relative', className)} {...props}>
        <div className="mb-8 flex items-baseline gap-3 font-mono text-mono uppercase tracking-[0.05em] text-paper-500">
          <span className="text-paper-300" aria-hidden="true">
            {numeral}
          </span>
          {eyebrow ? (
            <Heading className="m-0 inline font-mono text-mono font-normal uppercase tracking-[0.05em] text-paper-500">
              {eyebrow}
            </Heading>
          ) : null}
        </div>
        {children}
      </section>
    );
  },
);
NumberedSection.displayName = 'NumberedSection';

export { NumberedSection };
