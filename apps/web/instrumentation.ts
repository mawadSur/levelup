/**
 * Next.js `register()` hook — entry point for runtime instrumentation.
 *
 * Routes the Sentry init config based on the active runtime. The Next.js
 * Sentry SDK uses these three files (server / edge / client) so each
 * environment gets the appropriate transport + integrations. Client init
 * is wired automatically by the SDK from `sentry.client.config.ts`.
 *
 * Skeleton only — see sentry.client.config.ts for what is intentionally
 * NOT here (source map upload, PII scrubbing).
 */
export async function register(): Promise<void> {
  // Sentry init failures must never break the app boot. Wrap the dynamic
  // imports — if @sentry/nextjs throws on init (misconfigured DSN, network
  // blip pulling JS chunks, missing peer dep on a specific runtime),
  // we'd rather have an app that boots without error reporting than no
  // app at all. Logs surface in Vercel's function logs.
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('./sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('./sentry.edge.config');
    }
  } catch (err) {
     
    console.warn('[instrumentation] Sentry init skipped:', err);
  }
}
