# LevelUp AI Academy — End-to-end Tests

Playwright e2e test suite for the full LevelUp AI Academy application.

## Prerequisites

- Node ≥ 20.10
- pnpm 9
- Docker (for local Postgres + Redis via `infra/docker-compose.yml`)

## Running locally

```bash
# 1. Start infrastructure (Postgres, Redis)
pnpm infra:up

# 2. Apply DB migrations and seed demo data
pnpm db:migrate
pnpm db:seed

# 3. Install root dependencies
pnpm install

# 4. Download Playwright's Chromium binary
pnpm --filter @levelup/e2e install

# 5. Run the tests (starts both servers automatically)
pnpm --filter @levelup/e2e test
```

## Stub mode (default)

Tests are designed to run in **stub mode**. Stub mode is active when:

```
WORKOS_API_KEY=PLACEHOLDER_*
```

In stub mode:

- `GET /api/auth/sign-in` returns a `dev-bypass` URL instead of a real WorkOS authorization URL.
- `GET /api/auth/dev-bypass?email=&state=` looks up the user by email, builds a fake JWT session, and redirects to `/admin` (ADMIN role) or `/learn` (all other roles).
- The LLM coach module returns a canned stub response (no real OpenAI key needed).

## Running against real services

Set the real environment variables and start the dev servers manually:

```bash
# In one terminal
pnpm dev

# In another terminal — reuses the running servers
pnpm --filter @levelup/e2e test
```

The `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so running outside CI always reuses existing servers.

## Headed / UI mode

```bash
# Chromium with a visible browser window
pnpm --filter @levelup/e2e test:headed

# Playwright UI (interactive test explorer)
pnpm --filter @levelup/e2e test:ui
```

## Test structure

```
e2e/
  playwright.config.ts          Playwright configuration
  global-setup.ts               Health-check poller (waits for both servers)
  fixtures/
    test-fixtures.ts            Extends base test with adminPage / employeePage fixtures
  helpers/
    api.ts                      Direct API calls for setup/teardown (invitations, prompts)
    auth.ts                     Dev-bypass sign-in helper
  specs/
    01-marketing-and-auth.spec.ts   Marketing page + sign-in flow
    02-admin-people.spec.ts         Admin invite flow
    03-baseline-assessment.spec.ts  30-question baseline assessment
    04-lesson-completion.spec.ts    Lesson mark-as-read + quiz completion
    05-coach.spec.ts                AI coach streaming + save-to-library + sensitive data
```

## Seeded test users

| Email             | Role     |
| ----------------- | -------- |
| admin@demo.test   | ADMIN    |
| manager@demo.test | MANAGER  |
| eve@demo.test     | EMPLOYEE |
| ed@demo.test      | EMPLOYEE |

All users belong to the `demo-org` organization ("Demo Co").

## Test data decisions

- **No per-test org creation.** All tests use the seeded demo org and users. This avoids the complexity and latency of per-test org provisioning.
- **Cleanup in `test.afterEach`.** Tests that mutate state (create invitations, save prompts) clean up after themselves using the API helpers in `helpers/api.ts`.
- **Skips over missing features.** Where a UI detail depends on a feature that may not be in place (e.g. empty assessment item bank, quiz already completed), tests use `test.skip(condition, 'reason')` rather than failing.
