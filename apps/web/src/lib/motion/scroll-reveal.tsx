'use client';

import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import { useReducedMotion } from './use-reduced-motion';
import { fadeUp } from './variants';

interface ScrollRevealProps {
  children: ReactNode;
  /** Extra entrance delay in seconds. */
  delay?: number;
  /** Override the default fadeUp variant. */
  variants?: Variants;
  className?: string;
}

/**
 * Wraps its children in a `motion.div` that animates into view once when
 * the element enters the viewport. Collapses to a plain `<div>` when the
 * user prefers reduced motion.
 */
export function ScrollReveal({ children, delay, variants = fadeUp, className }: ScrollRevealProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  // Merge delay into the visible state's transition when provided.
  const delayedVariants: Variants =
    delay !== undefined
      ? {
          ...variants,
          visible: {
            ...(typeof variants.visible === 'object' && variants.visible !== null
              ? (variants.visible as object)
              : {}),
            transition: {
              ...(typeof variants.visible === 'object' &&
              variants.visible !== null &&
              'transition' in variants.visible
                ? ((variants.visible as { transition?: object }).transition ?? {})
                : {}),
              delay,
            },
          },
        }
      : variants;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={delayedVariants}
    >
      {children}
    </motion.div>
  );
}
