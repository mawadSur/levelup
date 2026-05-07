# LevelUp AI Academy

Role-based AI training platform for companies. Personalized lessons, hands-on practice with an AI coach, company-specific playbooks, and measurable skill progression.

> **Status:** in active build by an autonomous orchestrator. See [`tasks.md`](./tasks.md) for live progress.

## What's in here

```
apps/
  web/        — Next.js 15 (App Router) marketing site, admin dashboard, learner portal
  api/        — NestJS API (auth, learning, AI coach, billing, reporting)
  worker/     — BullMQ workers (cert PDFs, report aggregation, embeddings)

packages/
  db/             — Prisma schema, migrations, seed data
  types/          — Shared TS + Zod types
  ui/             — Shared Tailwind/shadcn React primitives
  llm/            — OpenAI client wrapper (streaming, cache, accounting)
  auth-client/    — WorkOS SDK wrapper (with dev-mode bypass)
  billing/        — Stripe wrapper
  queue/          — BullMQ typed job definitions
  config-eslint/  — Shared ESLint flat config
  config-tsconfig/— Shared tsconfig presets

infra/
  docker-compose.yml — Local Postgres+pgvector, Redis
```

## Quickstart

```bash
# 1. Prereqs: Node 20.10+, pnpm 9, Docker
nvm use                       # picks up .nvmrc

# 2. Install
pnpm install

# 3. Local infra (Postgres + Redis)
pnpm infra:up

# 4. Env
cp .env.example .env.local
# fill in real keys for OpenAI / WorkOS / Stripe / Resend if you want those flows live;
# placeholders are tolerated and stub the integration

# 5. DB
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 6. Dev
pnpm dev   # runs web (3000) + api (4000) in parallel
```

## Common scripts

| Command                             | What it does                 |
| ----------------------------------- | ---------------------------- |
| `pnpm dev`                          | Run web + api in dev mode    |
| `pnpm build`                        | Build all workspaces         |
| `pnpm typecheck`                    | TS check across the monorepo |
| `pnpm lint`                         | ESLint everything            |
| `pnpm test`                         | Run unit + integration tests |
| `pnpm db:studio`                    | Open Prisma Studio           |
| `pnpm format`                       | Prettier write               |
| `pnpm infra:up` / `pnpm infra:down` | Bring local services up/down |

## Architecture

- **Multi-tenant** — every row keyed by `organization_id`; row-level access enforced by NestJS guards.
- **AI coach** — streaming OpenAI calls, prompt-cache friendly, with a sensitive-data classifier in front.
- **Assessments** — adaptive item bank scored to a 1–4 level (Beginner → Champion).
- **Billing** — Stripe Checkout + webhooks; plan limits enforced in `OrganizationsModule`.
- **Auth** — WorkOS session cookies with RBAC (admin / manager / employee).

## Build process

This repo is being built autonomously by the **levelup-orchestrator** skill (see `.claude/skills/levelup-orchestrator/SKILL.md`). The skill reads `tasks.md`, dispatches specialist agents in parallel, verifies their work, and updates state.

To resume the build in a future session: invoke `/levelup-orchestrator` (or just say "continue building").

## Where to look next

- [`tasks.md`](./tasks.md) — current progress
- [`SETUP.md`](./SETUP.md) — environment + accounts you need
- [`docs/`](./docs/) — architecture decisions & playbooks (added as the build progresses)
