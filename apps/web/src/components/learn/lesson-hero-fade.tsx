'use client';

import { type ReactNode } from 'react';

interface LessonHeroFadeProps {
  children: ReactNode;
  className?: string;
}

/**
 * Thin client wrapper that applies a CSS fadeUp entrance animation to the
 * lesson hero (title + back-to-path row).  Uses a local @keyframes definition
 * rather than the motion-system agent's `<ScrollReveal>` so this component
 * stays zero-dep and server-component–friendly (it just wraps a div).
 *
 * `prefers-reduced-motion: reduce` skips the animation entirely; the content
 * is still visible immediately via the `animation-fill-mode: both` baseline.
 */
export function LessonHeroFade({ children, className }: LessonHeroFadeProps) {
  return (
    <>
      <style>{`
        @keyframes lessonHeroFadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .lesson-hero-fade {
          animation: lessonHeroFadeUp 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .lesson-hero-fade {
            animation: none;
          }
        }
      `}</style>
      <div className={['lesson-hero-fade', className].filter(Boolean).join(' ')}>{children}</div>
    </>
  );
}
