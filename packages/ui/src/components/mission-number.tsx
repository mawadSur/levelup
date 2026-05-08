'use client';

import * as React from 'react';
import { animate, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';
import { cn } from '../lib/cn';

type MissionNumberFormat = 'integer' | 'percent' | 'currency' | 'compact';

export interface MissionNumberProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'children'
> {
  value: number;
  format?: MissionNumberFormat;
  duration?: number;
  locale?: string;
}

function formatter(format: MissionNumberFormat, locale: string): (n: number) => string {
  switch (format) {
    case 'percent':
      return (n) =>
        new Intl.NumberFormat(locale, {
          style: 'percent',
          maximumFractionDigits: 1,
        }).format(n);
    case 'currency':
      return (n) =>
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(n);
    case 'compact':
      return (n) =>
        new Intl.NumberFormat(locale, {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(n);
    case 'integer':
    default:
      return (n) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(n));
  }
}

const MissionNumber = React.forwardRef<HTMLSpanElement, MissionNumberProps>(
  ({ value, format = 'integer', duration = 0.6, locale = 'en-US', className, ...props }, ref) => {
    const motionValue = useMotionValue(0);
    const fmt = React.useMemo(() => formatter(format, locale), [format, locale]);
    const display = useTransform(motionValue, (latest) => fmt(latest));
    const [text, setText] = React.useState(() => fmt(0));
    const prefersReducedMotion = useReducedMotion();

    React.useEffect(() => {
      if (prefersReducedMotion) {
        motionValue.set(value);
        setText(fmt(value));
        return;
      }
      const controls = animate(motionValue, value, {
        duration,
        ease: [0.2, 0.6, 0, 1],
      });
      const unsubscribe = display.on('change', (next) => setText(next));
      return () => {
        controls.stop();
        unsubscribe();
      };
    }, [value, duration, fmt, motionValue, display, prefersReducedMotion]);

    return (
      <span ref={ref} className={cn('tabular-nums', className)} aria-label={fmt(value)} {...props}>
        {text}
      </span>
    );
  },
);
MissionNumber.displayName = 'MissionNumber';

export { MissionNumber };
