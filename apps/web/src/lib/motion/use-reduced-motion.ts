import { useReducedMotion as _useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';

/** Re-export of motion/react's useReducedMotion hook. */
export { _useReducedMotion as useReducedMotion };

/**
 * Collapses variant states to instant transitions when the user prefers
 * reduced motion. Pass the result of `useReducedMotion()` as `reduce`.
 *
 * @example
 * const prefersReduced = useReducedMotion();
 * const safeVariants = withReducedMotion(fadeUp, prefersReduced ?? false);
 */
export function withReducedMotion(variants: Variants, reduce: boolean): Variants {
  if (!reduce) return variants;

  // Flatten every state to its target values with a zero-duration transition.
  const result: Variants = {};
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value === 'object' && value !== null) {
      // Strip opacity/transform motion while keeping the final resting values.
      const { transition: _t, ...rest } = value as Record<string, unknown>;
      result[key] = { ...rest, transition: { duration: 0 } };
    } else {
      result[key] = value;
    }
  }
  return result;
}
