import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Local real-auth config. Mirrors the deployed config but runs the local
 * dev servers, configured to talk to the user's real Supabase project and
 * the prod-pooler database (read by `.env` at the repo root). Used to verify
 * SSR session-handling fixes WITHOUT requiring a Vercel deploy round-trip.
 *
 * Spec file under `specs-local-realauth/` mirrors the deployed one — same
 * assertions, just pointed at localhost.
 *
 *   pnpm --filter @levelup/e2e exec playwright test \
 *     --config=playwright.local-realauth.config.ts
 */

/**
 * Read selected env values out of repo-root `.env` / `.env.local`. We can't
 * just rely on Next.js auto-loading them inside the spawned web/api processes
 * because we need to override a couple keys (NEXT_PUBLIC_API_URL, COOKIE_DOMAIN)
 * for the local boxes — and Playwright's `env` block fully replaces, it does
 * not merge.
 */
function loadRootEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  // ONLY read `.env`, not `.env.local`. The user's `.env.local` overrides
  // DATABASE_URL / NEXT_PUBLIC_SUPABASE_URL to localhost values for their
  // day-to-day dev (against docker postgres). For this real-auth e2e config
  // we want the real Supabase project + prod-pooler DB so the seeded demo
  // users line up with the Supabase Auth users we provisioned.
  const path = resolve(process.cwd(), '..', '.env');
  if (!existsSync(path)) return out;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    const raw = m[2];
    if (typeof key !== 'string' || typeof raw !== 'string') continue;
    const v = raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    out[key] = v;
  }
  return out;
}

const ROOT_ENV = loadRootEnv();

const REAL_ENV: Record<string, string> = {
  ...ROOT_ENV,
  NODE_ENV: 'development',
  // Browser + SSR must hit the local API, not the production Render one
  // (the .env points NEXT_PUBLIC_API_URL at prod by default).
  NEXT_PUBLIC_API_URL: 'http://localhost:4100',
  // Localhost cookies — without this @supabase/ssr writes Domain=.ailevel.app
  // and Chrome refuses to set the cookie on localhost.
  COOKIE_DOMAIN: 'localhost',
  // Avoid colliding with whatever's already on the default 3000/4000 ports.
  API_PORT: '4100',
  PORT: '4100',
  WEB_PORT: '3100',
};

export default defineConfig({
  testDir: './specs-local-realauth',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-local-realauth' }],
  ],
  outputDir: 'test-results-local-realauth',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @levelup/api dev',
      url: 'http://localhost:4100/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: REAL_ENV,
    },
    {
      command: 'pnpm --filter @levelup/web dev',
      url: 'http://localhost:3100/sign-in',
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: REAL_ENV,
    },
  ],
});
