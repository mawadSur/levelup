'use client';

import { useEffect, useState } from 'react';
import { cn } from '@levelup/ui';

/** Floating "Back to top" button that appears after scrolling 1000 px. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 1000);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className={cn(
        'fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-ink-600 bg-ink-900 shadow-md transition-all duration-200 hover:bg-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 12V4M4 7l4-4 4 4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
