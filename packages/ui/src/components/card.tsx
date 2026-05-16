'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-md border border-ink-600 bg-ink-800 text-paper-100',
        'transition-[transform,border-color] duration-200 ease-mission',
        'hover:-translate-y-[2px] hover:border-signal-dim',
        'motion-reduce:transition-none motion-reduce:transform-none',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

/**
 * `CardTitle` defaults to `<h3>` so existing callsites stay unchanged. Pass
 * `as="h2"` (or another heading level) when the page's outline requires it —
 * this lets us fix `heading-order` axe violations without sweeping every
 * caller. The element type is restricted to heading levels so callers can't
 * accidentally render a non-heading element.
 */
type CardTitleHeading = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: CardTitleHeading;
}
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Tag = 'h3', ...props }, ref) => (
    <Tag
      ref={ref}
      className={cn('font-sans text-h2 font-medium text-paper-100', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-body-sm text-paper-300', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
