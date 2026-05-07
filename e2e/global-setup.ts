/**
 * Global setup for LevelUp AI Academy e2e suite.
 *
 * Polls the API and web health endpoints for up to 60 seconds each before
 * running any tests. The webServer config in playwright.config.ts already
 * handles starting the processes; this setup is an extra safety net that
 * throws a clear, human-readable error when either service is down.
 */

const MAX_WAIT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

async function waitForUrl(url: string, label: string): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;
  let lastError: Error | null = null;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (res.ok) {
        console.log(`[global-setup] ${label} is up (${url})`);
        return;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `[global-setup] Timed out waiting for ${label} at ${url} after ${MAX_WAIT_MS / 1_000}s. ` +
      `Last error: ${lastError?.message ?? 'unknown'}`,
  );
}

export default async function globalSetup(): Promise<void> {
  await Promise.all([
    waitForUrl('http://localhost:4000/api/health', 'API (NestJS)'),
    waitForUrl('http://localhost:3000/api/health', 'Web (Next.js)'),
  ]);
}
