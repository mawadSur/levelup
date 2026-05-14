import { defineConfig, devices } from '@playwright/test';

/**
 * Stub-mode env injected into every webServer process.
 *
 * `isStubMode()` in packages/auth-client checks SUPABASE_URL / SUPABASE_ANON_KEY
 * for the "PLACEHOLDER_" prefix. We force those here so e2e never depends on
 * whether the developer's .env / .env.local has real Supabase creds. With stub
 * mode active the API exposes /api/auth/dev-bypass, which every auth fixture
 * uses to sign cookies without going through Supabase OAuth.
 */
const STUB_ENV = {
  NODE_ENV: 'development',
  SUPABASE_URL: 'PLACEHOLDER_supabase_url',
  SUPABASE_ANON_KEY: 'PLACEHOLDER_supabase_anon',
  SUPABASE_SERVICE_ROLE_KEY: 'PLACEHOLDER_supabase_service_role',
  NEXT_PUBLIC_SUPABASE_URL: 'PLACEHOLDER_supabase_url',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'PLACEHOLDER_supabase_anon',
  WORKOS_API_KEY: 'PLACEHOLDER_workos_key',
  COOKIE_DOMAIN: 'localhost',
} as const;

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
      env: { ...STUB_ENV },
    },
    {
      command: 'pnpm --filter @levelup/web dev',
      url: 'http://localhost:3000/sign-in',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...STUB_ENV },
    },
  ],
});
