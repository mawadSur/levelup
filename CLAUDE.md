# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo at a glance

**LevelUp AI Academy** — multi-tenant SaaS that trains employees to use AI safely and effectively. pnpm + Turborepo monorepo. Apps split into a Next.js 15 web frontend (`apps/web`), a NestJS API (`apps/api`), and a BullMQ worker (`apps/worker`). Shared logic lives in `packages/` (db, types, ui, llm, auth-client, billing, queue, observability, plus config presets).

This repo is being built incrementally by an autonomous orchestrator. Build state lives in `tasks.md` at the repo root — read it first to understand what's done, in flight, or pending. The orchestrator skill at `.claude/skills/levelup-orchestrator/SKILL.md` describes the dispatch pattern.

## Common commands

Run from repo root unless noted.

```bash
pnpm install
pnpm infra:up            # docker compose: Postgres+pgvector + Redis (run before db tasks / dev)
pnpm db:generate         # prisma generate (run after schema changes)
pnpm db:migrate          # prisma migrate dev (creates / applies migrations)
pnpm db:seed             # seeds demo org + paths from packages/db/content/
pnpm db:studio           # Prisma Studio
pnpm dev                 # turbo dev — runs web (3000) + api (4000) + worker in parallel
pnpm build               # turbo build (respects ^build deps; Prisma client generated first)
pnpm typecheck
pnpm lint
pnpm test                # runs vitest in each package + jest in apps/api
pnpm format              # prettier write
pnpm infra:down
```

Filter scripts to one workspace, e.g. `pnpm --filter @levelup/api dev`, `pnpm --filter @levelup/db studio`. Run a single Vitest file with `pnpm --filter @levelup/llm exec vitest run src/sensitive.test.ts`. Run a single NestJS e2e spec with `pnpm --filter @levelup/api exec jest --config test/jest-e2e.json test/auth.e2e-spec.ts`.

CI in `.github/workflows/ci.yml` runs the same `format:check → lint → typecheck → build → test` chain against a Postgres+Redis services pair.

## Stub mode (very important)

Every external integration (`OPENAI_API_KEY`, `WORKOS_API_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `OTEL_EXPORTER_OTLP_ENDPOINT`) tolerates a `PLACEHOLDER_*` value and falls back to a deterministic in-process stub. The pattern is consistent across packages: each has a `config.ts` with `isStubMode()` and a `stub.ts` with the canned behaviour. Stub mode throws at boot in `NODE_ENV=production`. Don't add new integrations without the same pattern — the dev experience depends on it. `WorkOS` stub uses `/api/auth/dev-bypass?email=...` to fake SSO; never ship that route enabled in production.

## Architecture

### Multi-tenant by `organizationId`

Every domain row carries `organizationId` (with cascade delete). Two intentional exceptions: `LearningPath` and `AssessmentItem` allow `organizationId = NULL` for global content shared across tenants. Every service must scope queries by the current org. Reads of "shareable" entities use a union: `WHERE organizationId = currentOrg OR organizationId IS NULL`. Writes are always single-tenant.

### Auth: default-secure

`AuthModule` registers `AuthGuard` and `RoleGuard` as `APP_GUARD` providers — every route is authenticated unless decorated with `@Public()` (auth callback, webhooks, health, marketing root, certificate verification). RBAC uses a hierarchy `ADMIN > MANAGER > EMPLOYEE`; `@Roles('MANAGER')` means "manager-or-higher". Sessions are JWE-encrypted (`dir` + `A256GCM`, key derived `SHA-256(SESSION_SECRET)`) so payloads can't be inspected client-side. Cookie name is `LEVELUP_SESSION` (`HttpOnly`, `SameSite=Lax`, 7-day TTL, also tracked as a `Session` row for audit/revocation).

### Webhooks need raw body

`apps/api/src/main.ts` mounts `express.raw({ type: 'application/json' })` on `/api/webhooks/stripe` _before_ the JSON body parser. Stripe signature verification reads `req.rawBody` directly — don't add another body parser ahead of that route or signature checks fail.

### Audit log everywhere

Every mutation writes to `AuditLog` with `(organizationId, actorId?, action, targetType?, targetId?, metadata)`. Action names use a `domain.verb` convention — `path.assign`, `coach.invoke`, `coach.sensitive_data_detected`, `billing.checkout_started`, `webhook.stripe.subscription.updated`, etc. Audit writes never block the parent operation (errors are caught and logged).

### AI coach data flow

1. Client → `POST /api/coach` or `POST /api/coach/stream` (SSE).
2. `CoachService` loads user (with `aiLevel`, dept, role) + latest `CompanyPolicy`.
3. Always runs `classifySensitive(userInput)` from `@levelup/llm` — regex first (SSN/credit-card/AWS-key/`sk-...`), optional Stage-2 LLM check (1s timeout). Trigger writes `coach.sensitive_data_detected` to AuditLog and sets a banner on the response, but never blocks the call.
4. `runCoach`/`streamCoach` builds the prompt from a stable system-prompt constant (cache-friendly: never mutate the prefix across calls) and asks for structured JSON (`explanation`, `improvedPrompt?`, `whyItWorks?`, `nextAction?`).
5. Streaming uses a tolerant incremental JSON parser that emits per-field deltas; the final event is the source of truth.
6. Persists `AiCoachSession` row with input, full response, sensitivity flag, tokens, model.
7. `RateLimitGuard` enforces 30 calls/minute/user (in-memory; production should swap to Redis-backed).

### Background jobs

`@levelup/queue` defines a typed `JobMap` for `cert-pdf | report-aggregate | embed-content | send-email`. Producers (in the API) call typed enqueue helpers; consumers (in `apps/worker`) call `createWorker(name, handler)` with full input/output type inference. Adding a new job requires updating `JobMap`, `JOBS`, and the corresponding helper — TypeScript enforces this. Cert PDFs are generated by the worker (pdfkit), written to `apps/api/.cert-output/<id>.pdf`, served via the API at `GET /api/certificates/:id/file`. Lesson embeddings use mean-pooled chunks upserted into `LessonEmbedding` (Prisma `Unsupported("vector(1536)")` field, written via raw SQL).

### Frontend

Next.js 15 App Router with route groups: `(auth)` (sign-in/sign-up/accept-invitation), `(admin)` (admin-only shell with sidebar nav, server-side session check), `(learn)` (employee shell), and root marketing pages (`/`, `/pricing`). `middleware.ts` does the cheap cookie check first; the API rejects expired sessions on every request. Server components fetch data via the typed client at `apps/web/src/lib/api/` (one file per domain, namespaced re-exports). Client components handle interactivity. Streaming is a manual `fetch` + `TextDecoder` SSE parser yielded as an `AsyncGenerator`. Theme tokens come from `@levelup/ui`'s `globals.css` (deep-indigo brand, light + dark via `.dark` class, `next-themes` provider). Use `cn` from `@levelup/ui` for class composition; never reach for `clsx` directly.

### Content

Learning content lives in `packages/db/content/<path-slug>/` as markdown files with YAML frontmatter (`slug, title, estimatedMinutes, orderIndex`) plus per-lesson quiz JSON. Assessment item bank at `packages/db/content/assessment-bank/items.json` (40 items). Sample policy at `packages/db/content/sample-policy/`. Prompt library starter at `packages/db/content/prompt-library/prompts.json` (50 prompts seeded as global `isShared: true`). The seed script under `packages/db/prisma/seed.ts` is the canonical loader — keep it idempotent (uses upserts).

### Observability

`@levelup/observability` wraps `@opentelemetry/sdk-node` with auto-instrumentations. Both `apps/api/src/main.ts` and `apps/worker/src/main.ts` import `./observability/start` _as the first import_ so OTel patches Node core before any framework loads. No-op when the OTLP endpoint env is a placeholder.

## Conventions agents must follow

- Strict TypeScript everywhere. Avoid `any` — use `unknown` + narrowing or generics. The few intentional escape hatches are documented inline.
- No comments unless they explain non-obvious _why_ (e.g., the prompt-cache invariant, the JWE algorithm choice, the "must be first import" line). Don't write what-the-code-does comments.
- Use `ZodValidationPipe` for request bodies, sourcing schemas from `@levelup/types`.
- Org-scope every Prisma read AND write. Don't trust foreign-key joins to enforce it.
- Don't edit `apps/api/src/app.module.ts` while a parallel agent is building a new module — the orchestrator pattern is "each module agent reports the import line and the orchestrator wires it manually" to avoid concurrent edits. Same for `main.ts`.
- The web app currently consumes some `@levelup/ui` source files via `transpilePackages`; don't break that by adding non-TS-source build artifacts the consumer can't compile.

## Known schema additions deferred

These were noted by agents during the build and not yet applied to `packages/db/prisma/schema.prisma`:

- `User.deactivatedAt: DateTime?` — `users.service.ts` falls back to nullifying `workosUserId` until added.
- `Organization.paymentFailed: Boolean @default(false)` — webhook handler audits but doesn't flag the org until added.
- `ReportSnapshot` model — worker stashes report payloads in `AuditLog.metadata` until added.

When the migration is run, search for `// TODO` or "deferred" markers near these areas to switch to the real columns.
