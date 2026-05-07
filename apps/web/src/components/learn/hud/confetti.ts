/**
 * Lazy-loaded confetti utility.
 *
 * canvas-confetti is loaded dynamically at call-time so it never lands in
 * the initial bundle. The import is wrapped in a Function constructor so
 * that static bundlers (webpack/turbopack) do NOT try to resolve it at
 * build time — the module is fetched by the browser only when this function
 * is invoked.
 *
 * Respects `prefers-reduced-motion`: returns immediately without firing when
 * the OS/browser setting is active.
 */
export async function fireConfetti(opts: { particles?: number; intense?: boolean }): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    // Use an indirect dynamic import so Next.js / webpack does not attempt to
    // statically resolve the module at build time. The browser resolves it
    // lazily at runtime when the function is first called.

    const load = new Function('id', 'return import(id)') as (
      id: string,
    ) => Promise<{ default: (opts: Record<string, unknown>) => void }>;
    const m = await load('canvas-confetti');
    m.default({
      particleCount: opts.particles ?? 80,
      spread: opts.intense ? 90 : 70,
      origin: { y: 0.6 },
      colors: ['#6E1A2F', '#F4EFE6', '#D4A24C'],
    });
  } catch {
    // canvas-confetti not available — fail silently; confetti is cosmetic.
  }
}
