'use client';

import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import { useReducedMotion } from './use-reduced-motion';
import { fadeUp, staggerChildren } from './variants';

// ---------------------------------------------------------------------------
// <Stagger> — orchestrates staggered entrance for direct children
// ---------------------------------------------------------------------------

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Custom delay before the first child animates (seconds). */
  delayChildren?: number;
  /** Gap between each child animation (seconds). */
  staggerAmount?: number;
}

/**
 * A scroll-triggered stagger container. Wrap children in `<ScrollItem>` to
 * participate in the stagger sequence.
 *
 * Collapses to a plain `<div>` when the user prefers reduced motion.
 */
export function Stagger({ children, className, delayChildren, staggerAmount }: StaggerProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={staggerChildren(delayChildren, staggerAmount)}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// <ScrollItem> — individual item inside a <Stagger>
// ---------------------------------------------------------------------------

interface ScrollItemProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}

/**
 * A stagger child. Must be a direct (or near-direct) descendant of `<Stagger>`
 * so the parent's orchestration can control its timing.
 */
export function ScrollItem({ children, className, variants = fadeUp }: ScrollItemProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
