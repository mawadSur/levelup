import type { Variants, Transition } from 'motion/react';

// ---------------------------------------------------------------------------
// Easing presets
// ---------------------------------------------------------------------------

export const easeStandard: Transition = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1],
};

export const easeQuick: Transition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1],
};

export const easeSpring: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 26,
};

export const easeBounce: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 18,
};

// ---------------------------------------------------------------------------
// Variant definitions
// ---------------------------------------------------------------------------

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: easeStandard },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeStandard },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: easeSpring },
};

/**
 * Creates a stagger container variant.
 * Children that consume this parent's orchestration should declare their own
 * `hidden`/`visible` variants (e.g. `fadeUp`).
 */
export const staggerChildren = (delayChildren = 0.05, staggerAmount = 0.06): Variants => ({
  hidden: {},
  visible: {
    transition: {
      delayChildren,
      staggerChildren: staggerAmount,
    },
  },
});

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: easeStandard },
};

export const correctBounce: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.06, 1],
    transition: { duration: 0.22, ease: [0.34, 1.56, 0.64, 1] },
  },
};

export const wrongShake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.32, ease: 'linear' },
  },
};
