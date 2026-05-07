'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Optional opt-in component that enhances route changes with the native
 * View Transitions API (`document.startViewTransition`).
 *
 * Mount this once inside any route-group layout where you want smooth
 * cross-route transitions:
 *
 * ```tsx
 * // app/(marketing)/layout.tsx
 * import { RouteTransitions } from '@/lib/motion/route-transitions';
 *
 * export default function MarketingLayout({ children }) {
 *   return (
 *     <>
 *       <RouteTransitions />
 *       {children}
 *     </>
 *   );
 * }
 * ```
 *
 * Falls back gracefully (no-op) in browsers that don't support the API
 * (e.g. Firefox ≤ 125, Safari ≤ 17).
 *
 * The animation duration / easing is driven by the `::view-transition-*`
 * CSS rules in `globals.css` — look for the `@layer base` block at the
 * end of that file.
 */
export function RouteTransitions() {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    // If View Transitions API is unavailable, bail out silently.
    if (typeof document === 'undefined' || !('startViewTransition' in document)) {
      return;
    }

    // The actual DOM update was already committed by Next.js. We trigger a
    // no-op transition here so the CSS animation plays for the newly rendered
    // content. For a richer effect, pair this with named `view-transition-name`
    // values on key elements.
    document.startViewTransition(() => {
      // no-op — Next.js already rendered the new page
    });
  }, [pathname, router]);

  return null;
}
