'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useTransform, animate, useMotionTemplate } from 'motion/react';
import { motion } from 'motion/react';
import { useReducedMotion } from './use-reduced-motion';

interface CountUpProps {
  /** Target numeric value to animate toward. */
  value: number;
  /** Animation duration in seconds (default: 1.2). */
  duration?: number;
  /**
   * Optional formatter applied to the current integer value.
   * Defaults to `Intl.NumberFormat` (locale comma-separated).
   */
  format?: (n: number) => string;
  className?: string;
}

const defaultFormat = new Intl.NumberFormat().format;

/**
 * Counts up from 0 to `value` on mount.
 * Respects `prefers-reduced-motion` — skips the animation and renders
 * the target value immediately.
 */
export function CountUp({
  value,
  duration = 1.2,
  format = defaultFormat,
  className,
}: CountUpProps) {
  const prefersReduced = useReducedMotion();
  const motionValue = useMotionValue(0);
  // Round to integer for display
  const rounded = useTransform(motionValue, (latest: number) => format(Math.round(latest)));
  const displayValue = useMotionTemplate`${rounded}`;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (prefersReduced || hasAnimated.current) return;
    hasAnimated.current = true;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [motionValue, value, duration, prefersReduced]);

  if (prefersReduced) {
    return <span className={className}>{format(value)}</span>;
  }

  return <motion.span className={className}>{displayValue}</motion.span>;
}
