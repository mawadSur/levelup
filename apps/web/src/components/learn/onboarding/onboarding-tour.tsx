'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { useOnboarding } from './onboarding-context';
import { StepCard } from './step-card';

// ---------------------------------------------------------------------------
// Step config
// ---------------------------------------------------------------------------

interface StepConfig {
  id: number;
  /** CSS selector(s) for the target element. Comma-separated fallbacks. */
  target: string;
  copy: string;
  primaryCta?: { label: string; href: string };
}

const STEPS: StepConfig[] = [
  {
    id: 0,
    target: '[data-onboarding="baseline-banner"], main',
    copy: 'Welcome to LevelUp. Take a 5-minute baseline so we can recommend what matters for your role.',
    primaryCta: { label: 'Start assessment', href: '/assessment' },
  },
  {
    id: 1,
    target: '[data-onboarding="quests"]',
    copy: 'Daily quests are 3 fast missions. Each gives you XP. Streaks compound, so don’t break them.',
  },
  {
    id: 2,
    target: '[data-onboarding="nav-coach"]',
    copy: 'Your AI coach helps you improve prompts, watches for sensitive data, and learns your role. Try it now.',
    primaryCta: { label: 'Try the coach', href: '/coach' },
  },
  {
    id: 3,
    target: '[data-onboarding="paths"]',
    copy: 'These are the paths assigned to you. Aim to complete one lesson today.',
  },
];

const TOTAL = STEPS.length;

// ---------------------------------------------------------------------------
// Positioning helpers
// ---------------------------------------------------------------------------

interface CardPosition {
  top: number;
  left: number;
  spotlightRect: DOMRect | null;
}

const CARD_WIDTH = 288; // w-72 = 18rem = 288px
const CARD_HEIGHT = 160; // conservative estimate
const OFFSET = 12; // px gap between target and card

function calcPosition(el: Element): CardPosition {
  const rect = el.getBoundingClientRect();

  // Check if the element is roughly visible in the viewport
  const inViewport =
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth;

  if (!inViewport) {
    return { top: -1, left: -1, spotlightRect: null };
  }

  // Place the card below the target, shifted right by OFFSET
  let top = rect.bottom + OFFSET;
  let left = rect.left + OFFSET;

  // Clamp so the card doesn't overflow the viewport
  if (left + CARD_WIDTH > window.innerWidth - 8) {
    left = window.innerWidth - CARD_WIDTH - 8;
  }
  if (left < 8) left = 8;
  if (top + CARD_HEIGHT > window.innerHeight - 8) {
    // Not enough room below — place above
    top = rect.top - CARD_HEIGHT - OFFSET;
  }
  if (top < 8) top = 8;

  return { top, left, spotlightRect: rect };
}

function getCenteredPosition(): CardPosition {
  const top = Math.max(8, (window.innerHeight - CARD_HEIGHT) / 2);
  const left = Math.max(8, (window.innerWidth - CARD_WIDTH) / 2);
  return { top, left, spotlightRect: null };
}

function resolveTarget(selector: string): Element | null {
  // Selector may be comma-separated (first match wins)
  const parts = selector.split(',').map((s) => s.trim());
  for (const s of parts) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Overlay clip-path spotlight helper
// ---------------------------------------------------------------------------

function spotlightClipPath(rect: DOMRect, padding = 6): string {
  const { top, left, bottom, right } = rect;
  const t = Math.max(0, top - padding);
  const l = Math.max(0, left - padding);
  const b = Math.min(window.innerHeight, bottom + padding);
  const r = Math.min(window.innerWidth, right + padding);

  // polygon that covers the entire screen EXCEPT the spotlight hole:
  // outer rectangle (clockwise) + inner hole (counter-clockwise)
  return [
    `polygon(`,
    // Outer rect
    `0 0, 100% 0, 100% 100%, 0 100%, 0 0,`,
    // Hole (counter-clockwise)
    `${l}px ${t}px,`,
    `${l}px ${b}px,`,
    `${r}px ${b}px,`,
    `${r}px ${t}px,`,
    `${l}px ${t}px`,
    `)`,
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 6,
    transition: { duration: 0.14, ease: 'easeIn' as const },
  },
};

const cardVariantsReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingTour() {
  const { state, advance, dismiss } = useOnboarding();
  const prefersReduced = useReducedMotion();

  const [position, setPosition] = useState<CardPosition | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStepConfig =
    state && !state.isDismissed && !state.isComplete ? (STEPS[state.currentStep] ?? null) : null;

  const reposition = useCallback(() => {
    if (!currentStepConfig) {
      setPosition(null);
      return;
    }
    const el = resolveTarget(currentStepConfig.target);
    if (!el) {
      setPosition(getCenteredPosition());
      return;
    }
    const pos = calcPosition(el);
    if (pos.top === -1) {
      setPosition(getCenteredPosition());
    } else {
      setPosition(pos);
    }
  }, [currentStepConfig]);

  // Reposition whenever the step changes or after first render
  // useLayoutEffect fires synchronously before paint to avoid flicker
  useLayoutEffect(() => {
    reposition();
  }, [reposition]);

  // Debounced reposition on window resize
  useEffect(() => {
    function handleResize() {
      if (resizeTimerRef.current !== null) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(reposition, 120);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimerRef.current !== null) {
        clearTimeout(resizeTimerRef.current);
      }
    };
  }, [reposition]);

  // Esc key dismisses the tour
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && currentStepConfig) {
        void dismiss();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepConfig, dismiss]);

  if (!currentStepConfig || !position) return null;

  const stepConfig = currentStepConfig;
  const stepIndex = stepConfig.id;

  const handleAdvance = () => {
    void advance(stepIndex);
  };

  const handleDismiss = () => {
    void dismiss();
  };

  const hasSpotlight = position.spotlightRect !== null;
  const variants = prefersReduced ? cardVariantsReduced : cardVariants;

  return (
    <>
      {/* Semi-transparent overlay with optional spotlight cutout */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9997]"
        style={{
          background: 'rgba(107, 26, 26, 0.35)',
          ...(hasSpotlight && position.spotlightRect
            ? {
                clipPath: spotlightClipPath(position.spotlightRect),
                WebkitClipPath: spotlightClipPath(position.spotlightRect),
              }
            : {}),
        }}
      />

      {/* The card itself — positioned absolutely via fixed */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed z-[9998]"
          style={{ top: position.top, left: position.left }}
        >
          <StepCard
            step={stepIndex}
            total={TOTAL}
            copy={stepConfig.copy}
            primaryCta={stepConfig.primaryCta}
            onAdvance={handleAdvance}
            onDismiss={handleDismiss}
          />
        </motion.div>
      </AnimatePresence>
    </>
  );
}
