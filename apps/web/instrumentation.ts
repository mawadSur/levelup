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
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
