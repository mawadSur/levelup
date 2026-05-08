'use client';

import { useEffect, useRef, useState } from 'react';

interface ReadingProgressBarProps {
  /**
   * Optional CSS selector for the article/container element to scope scroll
   * progress to. When provided, progress tracks the fraction of that element
   * that has scrolled past the viewport top.  When omitted, full-document
   * scroll is used.
   */
  target?: string;
}

/**
 * Medium-style reading-progress bar.
 * - 2 px tall, oxblood (`bg-signal`), fixed at the very top of the viewport.
 * - Fills left-to-right as the user scrolls through the lesson body.
 * - Hidden at scroll position 0 (width stays 0, no empty bar flash).
 * - `transition: width` is suppressed when `prefers-reduced-motion: reduce` is
 *   active; the bar still updates, just without the animated sweep.
 * - Scroll listener is passive and RAF-throttled to stay off the main thread.
 */
export function ReadingProgressBar({ target }: ReadingProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    function computeProgress(): number {
      const scrollTop = window.scrollY;

      if (target) {
        const el = document.querySelector(target);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Distance from the top of the element that has scrolled past the viewport
          const scrolled = -rect.top;
          // Total scrollable distance: element height minus viewport height
          const total = el.scrollHeight - window.innerHeight;
          if (total <= 0) return scrolled > 0 ? 100 : 0;
          return Math.min(100, Math.max(0, (scrolled / total) * 100));
        }
      }

      // Fallback: full document scroll
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return 0;
      return Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
    }

    function onScroll() {
      if (rafId.current !== null) return; // already scheduled
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        setProgress(computeProgress());
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Run once on mount in case the page is already partially scrolled
    setProgress(computeProgress());

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [target]);

  // Hide completely at zero — no ghost empty bar
  if (progress === 0) return null;

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .rpb-fill {
            transition: width 80ms linear;
          }
        }
      `}</style>
      <div
        role="progressbar"
        aria-label="Reading progress"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="fixed left-0 right-0 top-0 z-50 h-0.5"
        style={{ backgroundColor: 'transparent' }}
      >
        <div className="rpb-fill h-full bg-signal" style={{ width: `${progress}%` }} />
      </div>
    </>
  );
}
