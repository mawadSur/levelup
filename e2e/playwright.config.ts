import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for LevelUp AI Academy e2e tests.
 *
 * Stub mode is active when WORKOS_API_KEY starts with "PLACEHOLDER_".
 * In stub mode, /api/auth/dev-bypass is enabled and used by all auth helpers.
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Forward cookies across redirects (critical for the dev-bypass auth flow).
    extraHTTPHeaders: {},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and WebKit can be added once chromium tests are stable.
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] }  },
  ],
  webServer: [
    {
      command: 'pnpm --filter @levelup/api dev',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @levelup/web dev',
      url: 'http://localhost:3000/sign-in',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
