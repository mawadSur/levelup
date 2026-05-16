import { defineConfig, devices } from '@playwright/test';

/**
 * Deployed-site real-auth config.
 *
 * Runs against the production tenants — `ailevel.app` (kapitus) and
 * `ceolawyer.ailevel.app` (CEO Lawyer) — using the demo Supabase Auth users
 * provisioned by `scripts/seed-supabase-auth-users.ts`. No webServer block, no
 * docker, no stub mode: these tests exercise the same code path a real human
 * sees.
 *
 *   pnpm --filter @levelup/e2e exec playwright test \
 *     --config=playwright.deployed.config.ts
 */
export default defineConfig({
  testDir: './specs-deployed',
  fullyParallel: true,
  // Real Supabase rate-limits us; one worker only. One retry for the
  // documented first-hit 401 race where /api/auth/me returns 401 before
  // the session cookie has propagated through the SSR layer — flakes
  // intermittently on cold-start hits, always passes on retry.
  workers: 1,
  retries: 1,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-deployed' }]],
  outputDir: 'test-results-deployed',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'kapitus',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.KAPITUS_URL ?? 'https://ailevel.app',
      },
      testMatch: /.*\.spec\.ts$/,
    },
    {
      name: 'ceolawyer',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.CEOLAWYER_URL ?? 'https://ceolawyer.ailevel.app',
      },
      testMatch: /.*\.spec\.ts$/,
    },
  ],
});
