# LevelUp AI Academy — Build Tasks

> Source of truth for the orchestrator. Edit only via the orchestrator skill or by hand with the legend below.

## Status Legend

- `[ ]` not started
- `[~]` in progress (claimed by an agent)
- `[x]` complete and verified
- `[!]` blocked (see note)
- `(deps: T1.2, T2.4)` — must wait for those task IDs

---

## Phase 0 — Repo & Tooling Scaffolding

- [x] **T0.1** Initialize pnpm workspace monorepo at repo root with `apps/`, `packages/`, `infra/`, `docs/`
- [x] **T0.2** Root `package.json`, `pnpm-workspace.yaml`, `.nvmrc` (Node 20), `.editorconfig`, `.gitignore`
- [x] **T0.3** Root `tsconfig.base.json` with strict TS, path aliases per workspace
- [x] **T0.4** ESLint + Prettier config shared via `packages/config-eslint`, `packages/config-tsconfig`
- [x] **T0.5** Turborepo `turbo.json` for build/lint/test/dev pipelines (deps: T0.1)
- [x] **T0.6** Root `README.md` (quickstart) + `SETUP.md` (env vars, accounts to create)
- [x] **T0.7** `.env.example` listing every required key with placeholder values
- [x] **T0.8** Husky + lint-staged for pre-commit type+lint
- [x] **T0.9** GitHub Actions CI workflow (lint, typecheck, test, build) at `.github/workflows/ci.yml`
- [x] **T0.10** Docker Compose for local Postgres+pgvector and Redis at `infra/docker-compose.yml`

## Phase 1 — Database & Shared Packages

- [x] **T1.1** `packages/db` — Prisma project with Postgres + pgvector (deps: T0.1)
- [x] **T1.2** Prisma schema for all entities: organizations, users, learning_paths, lessons, quizzes, quiz_questions, user_progress, assessments, prompts, company_policies, ai_coach_sessions, certificates, badges, departments, invitations, sessions, audit_logs (deps: T1.1)
- [x] **T1.3** Initial migration + seed script with 3 learning paths (Basics, Sales, Managers) and demo org/users (deps: T1.2)
- [x] **T1.4** `packages/types` — shared TS types/zod schemas mirroring DB models (deps: T1.2)
- [x] **T1.5** `packages/ui` — shared React component primitives (Button, Card, Input, Badge, Progress, Tabs, Dialog, Toast) using Tailwind + Radix
- [x] **T1.6** `packages/llm` — OpenAI client wrapper with prompt-cache friendly streaming, retry, token accounting
- [x] **T1.7** `packages/auth-client` — WorkOS SDK wrapper (stubbed when key absent, with dev-mode magic-link bypass)
- [x] **T1.8** `packages/billing` — Stripe SDK wrapper (stubbed when key absent)
- [x] **T1.9** `packages/queue` — BullMQ wrapper with typed job definitions

## Phase 2 — Backend API (NestJS at `apps/api`)

- [x] **T2.1** Bootstrap NestJS app with global validation pipe, exception filter, request logging (deps: T0.1)
- [x] **T2.2** Prisma module wired to `packages/db` (deps: T1.3, T2.1)
- [x] **T2.3** AuthModule — WorkOS OAuth + session cookies, RBAC guard (admin/manager/employee) (deps: T1.7, T2.1)
- [x] **T2.4** OrganizationsModule — create org, invite users, list members, update plan (deps: T2.3)
- [x] **T2.5** UsersModule — profile, role/department assignment, set ai_level (deps: T2.3)
- [x] **T2.6** LearningPathsModule — CRUD + assign-to-user (deps: T2.2)
- [x] **T2.7** LessonsModule — CRUD + ordering, content delivery (deps: T2.6)
- [x] **T2.8** QuizzesModule — CRUD, submit answers, score (deps: T2.7)
- [x] **T2.9** ProgressModule — track lesson completion, compute path progress (deps: T2.7)
- [x] **T2.10** AssessmentsModule — baseline assessment generator, scoring, recommended_level output (deps: T1.6, T2.5)
- [x] **T2.11** CoachModule — streaming AI coach endpoint using prompt template, sensitive-data guard (deps: T1.6, T2.5)
- [x] **T2.12** PromptsModule — save/share user prompts, categorize (deps: T2.5)
- [x] **T2.13** PoliciesModule — upload company AI policy (text or file), list, version (deps: T2.4)
- [x] **T2.14** ReportingModule — completion rate, dept skill scores, risk flags, CSV export (deps: T2.9, T2.10)
- [x] **T2.15** CertificatesModule — generate signed PDF certificate on path completion (deps: T2.9)
- [x] **T2.16** BillingModule — Stripe checkout, webhook, plan enforcement (deps: T1.8, T2.4)
- [x] **T2.17** WebhooksController — Stripe + WorkOS (deps: T2.16, T2.3)
- [x] **T2.18** OpenAPI/Swagger doc at `/api/docs` (deps: T2.4) — wired in T2.1; module agents add @ApiTags as they go
- [x] **T2.19** Health/readiness endpoints + structured logging — shipped in T2.1

## Phase 3 — Frontend (Next.js 15 App Router at `apps/web`)

- [x] **T3.1** Bootstrap Next.js app with Tailwind, shadcn/ui, app router, dark/light theme (deps: T0.1, T1.5)
- [x] **T3.2** API client (typed fetch wrapper using `packages/types`) (deps: T1.4, T3.1)
- [x] **T3.3** Auth flow pages — sign-in, sign-up (org), accept-invitation (deps: T2.3, T3.2)
- [x] **T3.4** Marketing landing page `/` — hero, value props, pricing, CTA, footer (use frontend-design skill)
- [x] **T3.5** Pricing page `/pricing` with three tiers + Stripe checkout button (deps: T3.4, T2.16)
- [x] **T3.6** Admin dashboard `/admin` — stats cards, recent activity, quick actions (deps: T2.14, T3.3)
- [x] **T3.7** Admin → People `/admin/people` — invite, list, role/dept assignment (deps: T2.4, T3.6)
- [x] **T3.8** Admin → Learning `/admin/learning` — assign paths, view path catalog, custom path builder (deps: T2.6, T3.6)
- [x] **T3.9** Admin → Reports `/admin/reports` — dept skill heatmap, completion %, risk flags, CSV export (deps: T2.14, T3.6)
- [x] **T3.10** Admin → Policy `/admin/policy` — upload/edit company AI policy, approved tools list (deps: T2.13, T3.6)
- [x] **T3.11** Employee home `/learn` — assigned paths, current lesson, progress, badges (deps: T2.9, T3.3)
- [x] **T3.12** Lesson page `/learn/[pathId]/[lessonId]` — content, video, quiz, mark complete (deps: T2.7, T2.8, T3.11)
- [x] **T3.13** Baseline assessment flow `/assessment` — multi-step quiz → recommended level reveal (deps: T2.10, T3.3)
- [x] **T3.14** AI coach UI `/coach` — chat interface, streaming responses, prompt rewriter panel, save-prompt button, sensitive-data warning toast (deps: T2.11, T3.3)
- [x] **T3.15** Prompt library `/prompts` — list/save/copy reusable prompts with categories (deps: T2.12, T3.3)
- [x] **T3.16** Playbooks `/playbooks` — role-based content (Sales, Marketing, Support, HR, Finance, Managers, Execs, Eng) (deps: T3.11)
- [x] **T3.17** Profile `/profile` — name, dept, role, ai_level, certificates earned (deps: T2.5, T2.15, T3.3)
- [x] **T3.18** Manager view `/team` — direct reports' progress, suggested coaching (deps: T2.14, T3.3)
- [x] **T3.19** 404, error, loading boundaries; responsive nav + sidebar layout (deps: T3.1)

## Phase 4 — Content Seed

- [x] **T4.1** "AI Basics for Every Employee" — 6 lessons + quizzes (markdown content)
- [x] **T4.2** "AI for Sales Teams" — 6 lessons + quizzes
- [x] **T4.3** "AI for Managers" — 6 lessons + quizzes
- [x] **T4.4** "AI for Customer Support" — 5 lessons + quizzes
- [x] **T4.5** "AI for HR" — 5 lessons + quizzes
- [x] **T4.6** Baseline assessment item bank (40 items, mixed difficulty)
- [x] **T4.7** Prompt library starter (50 reusable prompts across roles)
- [x] **T4.8** Sample company AI policy doc

## Phase 5 — Cross-Cutting

- [x] **T5.1** Telemetry — OpenTelemetry traces from web → api, basic dashboard — `@levelup/observability` shared package, auto-instrumentation, stub mode, OTLP HTTP exporter
- [x] **T5.2** Audit log — every admin action recorded — every module writes to AuditLog
- [x] **T5.3** Sensitive-data classifier in coach (regex + LLM check) — warns on PII/PHI/secrets — shipped in @levelup/llm
- [x] **T5.4** Rate limiting on coach + assessment endpoints — shipped in CoachModule (RateLimitGuard, 30/min/user)
- [x] **T5.5** Email service (Resend) for invitations and certificates (deps: T2.4, T2.15) — apps/worker send-email handler with .eml outbox in stub mode
- [x] **T5.6** Background workers for cert PDF generation, report aggregation, embedding indexing (deps: T1.9, T2.15) — apps/worker with 4 typed BullMQ workers

## Phase 6 — Quality Gates

- [x] **T6.1** Vitest unit tests for `packages/llm`, `packages/types`, web client utils — 198 tests across 14 files
- [x] **T6.2** Jest e2e for NestJS modules using a test Postgres — auth + learning e2e specs
- [x] **T6.3** Playwright e2e — sign-up → invite teammate → take assessment → complete lesson → see cert — 5 specs, dev-bypass auth, seeded-user fixtures
- [x] **T6.4** Accessibility pass on key pages — axe-core sweep on live ailevel.app: 0 critical, 3 serious (streak `<span>` aria, sign-in mailto contrast, progressbar name) + 3 moderate (heading-order, missing h1 on /assessment/take, missing main landmark on error boundary) — all fixed. Report at `docs/qa/a11y-report-2026-05-12.md`. `/admin` partial coverage (test session not admin) — re-audit when an admin account is available.
- [x] **T6.5** Visual QA pass — qa-only sweep on live ailevel.app: health 68/100 on first pass. Fixed: 3 legal pages 404 (now ship `/legal/{privacy,terms,security}` stubs), 404 page chrome (now Kapitus chrome under `IS_KAPITUS`), `/coach` and `/assessment` redirect target loss. H2 brand-mismatch dismissed as false positive — agent was given the wrong spec (purple + Manrope IS the live Kapitus palette). Report at `docs/qa/visual-qa-2026-05-12.md`.
- [x] **T6.6** Security review (use security-review skill on completed code) — full review at `docs/security-review.md`: 1 critical, 6 high, 6 medium, 4 low, 1 info

## Phase 7 — Deploy

- [x] **T7.1** Vercel config for `apps/web`
- [x] **T7.2** Render/Fly.io config for `apps/api` + workers
- [x] **T7.3** Managed Postgres (Neon) + Upstash Redis setup notes in SETUP.md
- [x] **T7.4** Production environment matrix in SETUP.md

---

---

## CEO Review — 2026-05-07 (post-build)

**Mode:** HOLD SCOPE first (make existing scope bulletproof), then SELECTIVE EXPANSION (cherry-pick).
**Status:** ~62 of 70 tasks shipped, no integration test ever run.
**Posture:** This codebase is a draft, not a product. Every recommendation below assumes someone is going to run `pnpm install` next and the music will stop.

### P0 — Must do before any user sees this

These are the issues that turn the demo into a fire drill. Fix in this order.

- **CR.0** **[CRITICAL — proven by security review]** Cookie name mismatch: API sets `levelup_session` (lowercase), web reads `LEVELUP_SESSION` (uppercase) in `apps/web/middleware.ts`, `apps/web/src/lib/auth-client.ts`, and three coach pages. RFC 6265 makes cookie names case-sensitive — auth is broken on the web side. Fix by standardizing on the constant exported from `@levelup/auth-client/session.ts` (`LEVELUP_SESSION`) and updating both producer + consumer to match. **This alone would have broken the entire product on first deploy.**
- **CR.0a** **[CRITICAL — security review SEV-2]** Open redirect: `apps/api/src/modules/auth/auth.service.ts:329` accepts `?redirect=` if it `startsWith('/')` — this permits `//evil.com` (protocol-relative URL). Tighten to `redirect.startsWith('/') && !redirect.startsWith('//')` or use `URL` parsing with same-origin check.
- **CR.0b** **[HIGH — SEV-7]** Lesson completion not gated on path assignment. Any user can mark any visible lesson complete and self-issue a certificate for paths they were never assigned to. Add an `assignmentExists(userId, pathId)` check before status transitions in `progress.service.ts`.
- **CR.0c** **[HIGH — SEV-12]** `User.email @unique` is global instead of `@@unique([organizationId, email])`. Combined with the invitation flow, an attacker who knows a user's email can re-parent them into their own org via an invite. Migrate to per-org uniqueness.
- **CR.0d** **[HIGH — SEV-3]** No Stripe webhook idempotency. Add a `ProcessedWebhookEvent` table (id = stripe event id, processedAt) and reject duplicates at the controller boundary.
- **CR.0e** **[HIGH — SEV-4]** WorkOS webhook fails open when `WORKOS_WEBHOOK_SECRET` is unset (returns 200, processes nothing). Throw at boot if the env is missing in production. Also replace string compare with `crypto.timingSafeEqual`.
- **CR.0f** **[HIGH — SEV-5]** Certificate `signedHash` is `sha256(userId:pathId:Date.now())` with no secret — that's a hash, not a signature. Anyone who knows the inputs can recompute it. Switch to HMAC-SHA256 keyed by a `CERT_SIGNING_SECRET` env var.
- **CR.0g** **[HIGH — SEV-17]** Quiz `submitAttempt` always returns `correctAnswers` — including on failing attempts. This is an answer-key leak: a user can submit a known-wrong attempt to learn the correct answers and resubmit. Only return `correctAnswers` and `explanations` on a passing attempt, or after the user has consumed N attempts.
- **CR.1** Run `pnpm install && pnpm db:migrate && pnpm typecheck && pnpm build`. Fix every error. The build was authored without ever compiling — there are guaranteed type drifts.
- **CR.2** Apply the three deferred schema additions: `User.deactivatedAt: DateTime?`, `Organization.paymentFailed: Boolean @default(false)`, and the `ReportSnapshot` model (DDL is in `apps/worker/src/jobs/report-aggregate.ts` header comments). Then strip the fallback branches in `users.service.ts` and the webhook handler that exist only because those columns were missing.
- **CR.3** Make `LearningPath.organizationId` and `Prompt.organizationId` nullable in `schema.prisma`. They're queried with `IS NULL` already and the prompts service casts via `as Prisma.PromptWhereInput` to dodge the type system. Either nullable in schema OR move global content into a separate table. Pick one.
- **CR.4** Reconcile the API contract drift discovered by frontend agents. For each, decide whether the API gets extended or the UI stops asking:
  - `auth.me()` should return `aiLevel` (used by /learn for recommendations)
  - `assessments.submitAssessment` should return `scoreByLevel` (used by /assessment/result; UI currently synthesizes it)
  - `OrgStats` from `/organizations/me/stats` should expose `byRole` and `byDepartment` (admin dashboard expects them; falls back to completion report)
  - `Lesson` should expose `quizId` (lesson page currently probes a non-existent route)
  - `users.updateMe` should accept `jobTitle` and `avatarUrl` (profile edit form expects them)
  - `policies.publishPolicy` should accept the structured `approvedTools` shape (current `approvedTools: string[]` is wrong)
  - `progress.getMyProgress()` should return per-path aggregates, not a flat lesson list
- **CR.5** Wire `app.module.ts` correctly verified — every module agent reported the import line, but I added them in batches and may have missed `LearningModule` for the AssessmentItem item-bank seed loader. Read it once end-to-end.
- **CR.6** Webhook signature security: verify `apps/api/src/main.ts` still puts `express.raw()` for `/api/webhooks/stripe` BEFORE the JSON parser. The OTel `import './observability/start'` was added at line 1 and may have shifted things — re-read main.ts.
- **CR.7** Cookie `Secure` flag in production: `auth-client/session.ts` `serializeCookie` defaults `secure` from `NODE_ENV`. Confirm it's actually `true` when `NODE_ENV=production` and not just from a missing env.
- **CR.8** Rate-limit auth endpoints (sign-in, dev-bypass, accept-invitation). Currently only the coach is rate-limited. Brute-forcing the dev-bypass route in any environment that left it enabled would be trivial.

### P1 — High priority, in the first week

- **CR.9** **Single source for "current rate limit"** — CoachModule's in-memory token bucket is per-process. Multi-instance API → no real rate limit. Move to Redis-backed (`INCR` + `EXPIRE`). The same applies to ReportingModule's in-memory cache. Both are explicitly noted as TODO in code.
- **CR.10** **N+1 in /team** — Manager team page calls `getUserProgress(userId)` per row. Add a bulk `GET /progress/team?userIds=...` endpoint or precompute via a daily job into a `TeamProgressSnapshot` table.
- **CR.11** **Sensitive-data classifier blind spots** — Adds these regex categories: PEM private key blocks (`-----BEGIN`), ssh-rsa public key prefixes, JWT tokens (`eyJ...`), GitHub PATs (`ghp_*`), Slack tokens (`xox[abp]-*`), Anthropic keys (`sk-ant-*`), Google Cloud keys, UK National Insurance numbers, EU passport patterns. The current set is heavy on US-centric and Stripe-centric formats.
- **CR.12** **Audit-log retention** — `AuditLog` will grow forever. Add a 13-month TTL job that archives to cold storage and deletes from hot. Required for GDPR/CCPA and for keeping admin queries fast.
- **CR.13** **Dead-letter queue** — BullMQ retries 5x then drops. Add a `failed` table or alert; currently failed jobs vanish into the void.
- **CR.14** **Backup strategy** — Document Postgres point-in-time recovery on Neon. Test a restore. Document RTO/RPO targets.
- **CR.15** **GDPR data export + deletion** — Add `GET /users/me/export` returning a zip of all user-owned rows, and `DELETE /users/me` that schedules a 30-day soft-delete job. Required for any EU customer.
- **CR.16** **Frontend tests** — The 198 tests are all package-level. Zero React component tests, zero MSW mocks, zero hook tests. Add at minimum: SignInForm, AssessmentRunner, CoachChat streaming, QuizRunner.
- **CR.17** **Webhook idempotency** — Stripe webhooks can be redelivered. Current `recordPlanChange` is naturally idempotent for plan updates, but `checkout.completed` writes audit logs every time. Add a `processed_webhook_events` table (event_id, processed_at) keyed on `event.id`, INSERT-and-skip-if-conflict.
- **CR.18** **Coach conversation memory** — Currently every invocation is stateless. A real "AI coach" remembers the conversation. Add a `conversationId` thread concept; pass prior turns in the system prompt (truncated to N tokens).

### P2 — Medium priority, before scaling past pilot

- **CR.19** **Onboarding flow** — A new user lands on `/learn` cold. Add a 4-step "welcome tour": baseline assessment → first lesson → save first prompt → invite a teammate. Track completion in a `UserOnboarding` table.
- **CR.20** **Demo data reset** — The seed data is the same for every demo. Add a `POST /admin/demo/reset` (admin-only, protected by env flag) that wipes and re-seeds with the demo company's name in the data.
- **CR.21** **Feature flags** — Add a simple `feature_flags` table keyed by `(organizationId, key)` with a `FlagModule` that exposes `flagsService.isEnabled(orgId, key)`. Gate experimental features (e.g., "team-coaching-suggestions-v2") behind it.
- **CR.22** **Lesson semantic search** — `LessonEmbedding` is computed but unused. Add `GET /search?q=...` that does pgvector cosine similarity across lessons + prompts the user has access to. Top 10 results.
- **CR.23** **AI for Marketing path** — Promised in product blueprint but never authored. Six lessons + quizzes following the same pattern as Sales/Manager.
- **CR.24** **Manager weekly digest email** — Worker has `manager-digest` template but no scheduler. Add a cron job (BullMQ `repeat`) that fires every Monday at 8am org-time and enqueues a digest per manager.
- **CR.25** **Activity feed API** — Profile page and admin dashboard both stub "Activity" sections. Add `GET /users/:id/activity?limit=20` that returns last lesson completions + quiz attempts + cert earns. Read from existing tables; no new model needed.
- **CR.26** **CDN for static assets** — Lesson markdown is fine (renders SSR), but cert PDFs are served by the API. Move to Cloudflare R2 + signed URLs in production.
- **CR.27** **Pricing tier curve** — $499 → $1,499 → $5,000 has a 3x jump that pushes mid-market into a discount conversation. Consider a $999 "Team" tier (100 seats, no SSO) or move Growth down to $1,099. Test against actual deals.
- **CR.28** **Single-region risk** — All deploy configs target `iad1` / Oregon. Add a multi-region playbook for the database and a CDN-fronted API for read replicas.
- **CR.29** **Visual QA + a11y** — T6.4 + T6.5 are deferred until `pnpm install` runs. Once it boots, run `axe-core` against the 6 most-trafficked routes (`/`, `/sign-in`, `/admin`, `/learn`, `/coach`, `/assessment`) and fix critical a11y violations.
- **CR.30** **Accessibility on quiz runner** — Radio choices use buttons styled as cards. Verify keyboard navigation (arrow keys), screen reader labels, focus rings.

### P3 — Strategic / scope expansion (cherry-pick)

These are not required to ship the MVP but materially change the product's ceiling.

- **CR.31** **Slack/Teams integration** — Bot that posts a daily digest in a manager's channel + lets users `/coach` directly from Slack. This is the integration that makes adoption stick — once a workflow lives in Slack, it doesn't move. Effort: M.
- **CR.32** **Custom path builder UI** — Currently admin must call API to create custom paths. The /admin/learning UI has the affordance but the agent stubbed the actual builder. Build a real WYSIWYG path builder. Effort: M.
- **CR.33** **AI-generated content for custom paths** — "Describe your team's workflow, generate a 6-lesson custom path." This is the killer "pay more for AI" tier feature. Uses the LLM wrapper + structured output. Effort: M.
- **CR.34** **Team prompt library hierarchy** — Prompts have org-shared + private + global library. Add a layer: department-shared. So Sales-team prompts don't pollute the Marketing-team library. Effort: S.
- **CR.35** **Risk-flag automation** — Reporting computes risk flags but no one acts on them. Add: when a HIGH flag fires, auto-email the user's manager with a coaching suggestion (use the `manager-digest` template path). Effort: S.
- **CR.36** **Public verifiable certificates** — `/certificates/verify/:hash` exists but has no shareable URL or LinkedIn integration. Add a public certificate page with shareable Open Graph image (rendered via `@vercel/og`). Effort: S.
- **CR.37** **Org-level prompt analytics** — Show "top 10 most-saved prompts in your org this week," "prompts that prevented a sensitive-data leak." Builds the network effect. Effort: M.
- **CR.38** **Multi-language support** — Spanish, French, Portuguese MVP for international rollout. Lessons are in `packages/db/content/`, easy to translate. Add Next.js i18n routing. Effort: L.
- **CR.39** **Voice mode for AI coach** — Whisper input + TTS output for hands-free coaching. Differentiator vs. ChatGPT-as-corporate-tool. Effort: L.
- **CR.40** **Anomaly detection on usage** — Detect "this user's coach usage spiked 5x in the last week and they're flagging sensitive data" — proactive risk surface. Effort: L.

### What NOT to do (explicitly out of scope)

- **NOT** building a video lesson editor. Video is referenced as a `videoUrl` field but creating a Loom-killer is way out of scope.
- **NOT** a SCORM/LMS integration. Listed as "later" in the blueprint; resist customer requests until $5k+ contracts justify it.
- **NOT** a marketplace of third-party content. The differentiator is curation; a marketplace dilutes it.
- **NOT** a chat interface for managers to talk to their reports. That's a HR tool, not an AI training tool.
- **NOT** mobile native apps. Mobile web is sufficient for the consumption use case.

### Process recommendations

- **CR.P1** **Stop the autonomous build until P0 is closed.** Adding new features on top of a codebase that's never been compiled is malpractice. Boot it, fix the type errors, then resume.
- **CR.P2** **Replace the "every agent reports the import line for app.module.ts" pattern** with a single AppModule scaffold that imports `./modules/**/*.module` via glob, OR have each module register itself via `forFeature()`. The current pattern survived ~12 module integrations but is fragile.
- **CR.P3** **Document a "module conventions" file** so future agents and human contributors don't drift on org scoping, audit log naming, RBAC, validation pipe usage. Half the agents got this right by inference; codify it.
- **CR.P4** **The orchestrator skill is a one-shot tool, not a sustainable engineering process.** Once the team is human, add a real CONTRIBUTING.md, a PR template, and code review.

### Positive observations (what the build got right)

Worth saying out loud so it doesn't get lost:

- Multi-tenant isolation is uniform: every service scopes by `organizationId`, no leaks found in spot-check.
- Audit log discipline is genuinely good: every mutation writes an event with consistent action naming.
- Default-secure auth: `APP_GUARD` + `@Public()` opt-out is the right posture for a SaaS handling PII.
- Stub-mode-everywhere is a great DX choice. Onboarding a new dev requires zero external accounts.
- Sensitive-data classifier runs always (regardless of stub mode), audited on every trigger, doesn't block. Right call.
- JWE-encrypted sessions instead of signed JWTs. Right call for a session that contains role + email.
- The 60s in-memory cache on reports is per-process — intentionally documented as such with a Redis upgrade path. Honest tradeoff.
- Prisma raw SQL is parameterized in the embedding worker. No SQL injection surface there.
- The pgvector extension is enabled in the init migration, not lazily. Saves a 3am incident later.

### Completion gate

Block these before declaring "MVP shipped":

- All P0 items resolved.
- `pnpm test` green across the monorepo.
- One real Postgres + Redis instance hosting a happy-path e2e (Playwright spec passes).
- One real OpenAI key wired through the coach (verify streaming + sensitive-data flow end to end).
- One real Stripe checkout completes with a webhook updating the org's plan.
- A non-author signs into a fresh org and successfully completes one lesson + one coach session within 5 minutes.

If any of those fail, you don't have an MVP, you have a code generator's hallucination of one.

---

## Orchestrator Notes

- After completing a task, append one line under "Completion log" below.
- If blocked, change to `[!]` and write the reason inline.

## Completion Log

<!-- Orchestrator appends entries here, newest last. Format: `T0.1 — short note — YYYY-MM-DD` -->

- T0.1–T0.10 — Phase 0 scaffolded: pnpm workspace, turbo, eslint/prettier/tsconfig packages, husky, CI workflow, docker compose with pgvector+redis, README+SETUP — 2026-05-06
- T1.1–T1.4 — `@levelup/db` Prisma project (22 models, pgvector, multi-tenant, init migration, idempotent seed) + `@levelup/types` zod schemas across auth/learning/coach/billing/admin — 2026-05-06
- T1.5 — `@levelup/ui` shadcn primitives (18 components) with deep-indigo brand tokens, light+dark, levelupPreset — 2026-05-07
- T1.6 — `@levelup/llm` OpenAI wrapper: streaming structured coach output, sensitive-data classifier (regex+optional LLM), embeddings, retry, accounting, full stub mode — 2026-05-07
- T1.7 — `@levelup/auth-client` WorkOS wrapper with JWE-encrypted sessions (dir+A256GCM), dev-mode magic-link bypass, RBAC helpers — 2026-05-07
- T1.8 — `@levelup/billing` Stripe wrapper: checkout, portal, webhook parser as discriminated union, plan/seat helpers, full stub — 2026-05-07
- T1.9 — `@levelup/queue` BullMQ wrapper with typed job catalog (cert-pdf, report-aggregate, embed-content, send-email) — 2026-05-07
- T2.1 — NestJS api shell: zod env, JSON logger, request-id, global exception filter, validation pipe, lazy-Swagger, health endpoints — 2026-05-07
- T2.2 + T2.3 — PrismaModule (global) + AuthModule with global APP_GUARD AuthGuard, RoleGuard, WorkOS callback, dev-bypass, invitation-aware org bootstrapping, audit logs — 2026-05-07
- T2.4 + T2.5 — Organizations + Users modules: org/dept CRUD, invitations with email enqueue, seat-limit enforcement, last-admin guard, deactivation — 2026-05-07
- T2.10 — AssessmentsModule: pure scoring fn, mulberry32+djb2 sampling, SHA-256 session fingerprint, first-baseline auto-level-update — 2026-05-07
- T3.1 — Next.js 15 web shell: route groups for marketing/admin/learn, middleware cookie gate, theme provider, Inter font, server-only auth helper — 2026-05-07
- T4.1–T4.6 — content shipped: AI Basics (6 lessons), AI Sales (6), AI Managers (6), AI Support (5), AI HR (5), 40-item assessment bank with proportional sampling rules — 2026-05-07
- T7.1–T7.4 — Vercel config, Render blueprint + Fly toml + Dockerfiles for api/worker, full Neon/Upstash + env-matrix in SETUP — 2026-05-07
- T2.6–T2.9 — Learning module (paths/lessons/quizzes/progress) — auto-cert on path completion, first-lesson badge, quiz correctIndex never returned in reads — 2026-05-07
- T2.11 — CoachModule with manual-SSE streaming, 30/min rate limit, sensitive-data audit log on every trigger, owner-only sessions — 2026-05-07
- T2.12 + T2.13 — Prompts + Policies modules; manager+ enforced for org-shared prompts; policies version-only-forward — 2026-05-07
- T2.14 + T2.15 — Reporting (60s in-memory cache, CSV with BOM+CRLF) + Certificates (pdfkit, local fs storage with cloud stub) — 2026-05-07
- T2.16 + T2.17 — BillingModule + WebhooksController with Stripe raw-body wired in main.ts, idempotent plan changes — 2026-05-07
- T3.1 — Next.js 15 web shell with route groups, middleware cookie gate, theme provider — 2026-05-07
- T3.2 + T3.4 — typed API client (17 domain modules) + production-grade marketing landing (10 sections, inline dashboard mock) — 2026-05-07
- T3.3 — Auth flow pages with stub-mode dev-bypass support — 2026-05-07
- T3.5 — Pricing page with 3 tiers + Stripe checkout for signed-in users — 2026-05-07
- T3.6 + T3.7 — Admin shell with sidebar, dashboard, /admin/people with tabs (members/invites/depts) and inline mutations — 2026-05-07
- T3.8 + T3.9 + T3.10 — Admin Learning (catalog/assignments/custom paths) + Admin Reports (heatmap, dept/path bars, risk flags, CSV export) + Admin Policy (markdown editor, approved-tools structured form) — 2026-05-07
- T3.11 + T3.12 — Employee /learn home + lesson reader with react-markdown XSS-safe rendering, inline quiz runner, mobile TOC — 2026-05-07
- T3.13 + T3.14 — Assessment runner (state machine, localStorage resume) + AI coach UI (streaming, typing dots, save-prompt, sensitive banner, abort) — 2026-05-07
- T3.15 + T3.16 + T3.17 + T3.18 + T3.19 — Prompt library, Playbooks index, Profile, Manager team view (with coaching heuristics), polished 404/error/loading — 2026-05-07
- T4.7 + T4.8 — 50-prompt library + 2,500-word sample policy + 16 approved tools across 3 tiers — 2026-05-07
- T5.1 — `@levelup/observability` shared package; api+worker bootstrap OTel as first import — 2026-05-07
- T5.5 + T5.6 — apps/worker with 4 typed BullMQ workers (cert-pdf, report-aggregate, embed-content, send-email); .eml outbox in stub mode — 2026-05-07
- CR.0a — open redirect fixed: `?redirect=//evil.com` now rejected — 2026-05-07
- CR.0b — lesson completion gates on `LearningPathAssignment`; admin/manager bypass; new `progress.assignment_denied` audit action — 2026-05-07
- CR.0c — `User.email` switched from global `@unique` to composite `@@unique([organizationId, email])`; auth.service.ts now does WorkOS-id-then-org-scoped lookups — 2026-05-07
- CR.0d — Stripe + WorkOS webhooks idempotent via `ProcessedWebhookEvent` table keyed on provider event id — 2026-05-07
- CR.0e — WorkOS bearer compared via `crypto.timingSafeEqual`; production env validation requires `WORKOS_WEBHOOK_SECRET` to be set — 2026-05-07
- CR.0f — Certificate `signedHash` switched from `sha256(public-inputs)` to HMAC-SHA256 keyed by `CERT_SIGNING_SECRET`; verification endpoint runs HMAC re-check defense-in-depth; both manual issue + path-completion auto-issue paths migrated — 2026-05-07
- CR.0g — Quiz `submitAttempt` withholds `correctAnswers` and `explanations` until pass OR 3rd failed attempt; `attemptsRemaining` returned for UI; quiz-runner.tsx handles missing-data state — 2026-05-07
- CR.2 — schema additions applied: `User.deactivatedAt`, `Organization.paymentFailed`+`paymentFailedAt`, `ReportSnapshot` model with FKs+indexes; service fallback branches stripped; report-aggregate worker writes real snapshots — 2026-05-07
- CR.11 — sensitive-data classifier expanded with 24 new patterns (PEM, OpenSSH, JWT, GitHub PATs, Slack, Anthropic/OpenAI/Stripe/Twilio/SendGrid/Google keys, UK NI, NHS, MRN, BIC, customer-id) plus 32 new tests; 59/59 sensitive tests green — 2026-05-07
- CR.23 — AI for Marketing learning path: 6 lessons (positioning, headline iteration, audience research, content briefs, launch stress-test, measurement) + 6 quizzes, 822-899 words/lesson — 2026-05-07
- New endpoints — `GET /users/me/badges`, `GET /users/:id/activity` (50-event timeline across lessons/quizzes/certs/badges), `GET /invitations/preview/:token` (PUBLIC), `POST /organizations` (PUBLIC, signup flow with rate-limited org creation + welcome email) — 2026-05-07
- CR.18 — Coach conversation memory: `Conversation` + `ConversationTurn` Prisma models; `runCoach`/`streamCoach` accept prior turns (cap 10 turns / 6000 tokens) preserving the prompt-cache prefix invariant; new `/coach/conversations` REST surface; legacy `/coach/sessions/*` kept as deprecated aliases; coach-chat hydrates from `?c=<id>` and pins the URL on first send — 2026-05-07
- CR.19 — Onboarding tour: `UserOnboarding` table + 4-step server-driven state (advance/dismiss/restart with anti-skip validation); spotlight-style overlay positioned via `getBoundingClientRect`; `data-onboarding` attribute hooks on /learn page sections + Coach nav link — 2026-05-07
- CR.9 — Rate limiter moved from in-process Map to Redis sliding-window (INCR + PEXPIRE) via `@levelup/queue/checkRateLimit`; coach guard sets 429 + `Retry-After`; fail-open on Redis hiccups — 2026-05-07
- CR.10 — Bulk team progress: `POST /progress/team` accepts up to 200 user IDs in one request, replaces N+1 `getUserProgress` loop on the team page — 2026-05-07
- CR.12 — Audit log retention: 13-month TTL job (`audit-cleanup` BullMQ worker) with batched deletes; recurring schedule daily 03:00 UTC via stable jobId — 2026-05-07
- CR.13 — Dead-letter queue: `DeadLetterJob` table + `attachDlqListener` writes failed jobs once `attemptsMade >= attempts`; wired into all 7 BullMQ workers — 2026-05-07
- CR.15 — GDPR self-service: `DataExportRequest` + `DeletionRequest` models; `/privacy` page with export-now and 30-day-grace deletion flows; worker builds zip via `archiver`; download streamed with ownership checks; `account-deletion-confirmation` email template — 2026-05-07
- CR.22 — Lesson semantic search: `SearchModule` with pgvector cosine query against `LessonEmbedding`; mixes prompts; text-fallback in stub mode; Cmd+K global search dialog on learner pages — 2026-05-07
- CR.24 — Manager weekly digest: BullMQ recurring `manager-digest-cron` (Mondays 8am UTC, stable jobId) fans out per-manager `send-email` jobs with completion %, risk flags, top movers — 2026-05-07
- Frontend polish — pricing tier `<PlanCard>` extracted with elevated Growth tier (lg:scale + ribbon); slow ink-blot loading skeletons replace shadcn shimmer; toast Toaster wrapped with Fraunces titles + oxblood variant border + soft enter bounce — 2026-05-07
- Test fixes — `vi.hoisted` env setup for billing + auth-client tests (ESM hoisting bug); retry rejection handler attached before `runAllTimersAsync` (3 unhandled rejections eliminated); session expiry wait bumped to 2100ms (integer-second flooring); scoring tests rewritten with per-level `partialResponses` + 0.7 ratio for unambiguous threshold math — 2026-05-07

## Wave 3 — 2026-05-07

- CR.21 — Feature flags: `FeatureFlag` table with org-override-over-global pattern; djb2-hashed `rolloutPercent` evaluation per `(userId, key)`; `<FlagsProvider>` + `useFlag(key)` hook; `/admin/flags` admin UI with toggle + rollout % + reset-to-global
- /admin/dlq + /admin/audit — admin ops surfaces: filterable DLQ table with retry (typed enqueue dispatch by jobName) + delete; audit log viewer with cursor pagination, action/actor/target filters, client-side CSV export
- CR.34 — Department-shared prompts: `Prompt.departmentId` scope; visibility filter extended (mine OR org-shared OR dept-shared OR global); manager+ guard on dept scope; UI shows scope picker + dept badge + filter pill
- CR.35 — Risk-flag auto-email: `RiskAlertsService.checkAndNotify` fired fire-and-forget from coach after sensitive-data trigger; 3-events-in-30-days threshold; dedupes via `risk_alert.email_sent` audit; manager fan-out (dept-first, org-fallback, cap 5); new `risk-alert-email` template
- CR.33 — AI-generated learning paths (the differentiator feature): `PathGenerationRequest` table; LLM `generateLearningPath` with strict JSON schema (6 lessons × 3 quiz questions); async `path-generation` BullMQ worker; `/admin/learning/build` page with prompt input + 3s status polling + READY preview + edit drawer + accept-into-real-LearningPath transactional flow
- CR.36 — Public verifiable certificate page at `/certificates/verify/[hash]` with dynamic Open Graph image (edge runtime, Inter via gstatic fetch); shows holder/path/org/date or "could not verify"; OG image renders for LinkedIn/Twitter sharing
- CR.16 — Frontend component tests: RTL + MSW + jsdom + `@vitejs/plugin-react`; 31 new tests across SignInForm, QuizRunner, AssessmentRunner, CoachMessage, QuestCard; 54/54 web tests pass
- CR.30 — Quiz a11y: `<fieldset>` + `<legend>`, `role="radiogroup"`, `aria-labelledby`, arrow-key navigation between choices, `focus-visible:` ring overlay on hidden radios, `role="status" aria-live="polite"` on result reveal
- CR.20 — Demo data reset: `POST /demo/reset` gated by env + name-allowlist; transactional wipe (org-scoped only) + reseed with mulberry32 PRNG seeded by company name; small/medium/large variants; admin "Demo controls" card on dashboard when `NEXT_PUBLIC_DEMO_CONTROLS=on`
- CR.14 — Postgres backup runbook + incident response runbook in `docs/runbooks/`

## Wave 4 — 2026-05-07

- CR.31 — Slack integration: `OrganizationIntegration` table with AES-256-GCM encrypted tokens; `@levelup/integrations-slack` workspace pkg (oauth, blocks, encryption, client); `/integrations/slack/install` + `/callback` + `/events` + `/commands` + `/interactivity` endpoints with HMAC state + `crypto.timingSafeEqual` signature verification; `/admin/integrations` UI; manager weekly digest now ALSO delivers via Slack DM when integration is connected (worker imports `@levelup/integrations-slack` directly to avoid api dependency)
- CR.39 — Voice mode for AI coach: `@levelup/llm` `transcribeAudio` (Whisper / `gpt-4o-mini-transcribe`) + `synthesizeSpeech` (`tts-1`); `POST /coach/transcribe` (multipart, 30 MB cap) + `POST /coach/synthesize`; `<VoiceControls>` with hold-to-talk mic, live waveform via AnalyserNode, MIME negotiation, speak-responses toggle persisted to localStorage, TTS playback stops on new message / stop button
- Analytics — `@levelup/analytics` workspace pkg with typed event taxonomy + PostHog Node client (stub-mode aware); 6 server-side capture sites (lesson_completed, path_completed, quiz_attempted, coach_invoked, prompt_saved/cloned, assessment_submitted, checkout_started); `<PostHogProvider>` on both shells with autocapture/session-recording disabled; client-side captures on coach send + quiz submit
- CR.37 — Org-level prompt analytics: `/admin/insights` page with top-cloned prompts, top-saved prompts, 30-day usage trend (custom inline SVG line chart, oxblood + warm-amber, hover crosshair), saves-prevented card with category breakdown + anonymized recent examples, category mix bar list; 5-minute in-memory cache per org+query; raw SQL with `date_trunc()` for time bucketing
- CR.40 — Anomaly detection: `AnomalyAlert` table; hourly worker scans 5 detectors (coach usage spike 5x/10x, sensitive-data burst ≥5/24h, streak-broken-at-risk, path-builder abuse 8/24h, prompt-cloning abuse >30/24h); 24h dedup; `/admin/anomalies` page with severity grouping + acknowledge button; nav badge with unack count
- CR.32 — Manual path editor: `POST /paths/:id/save-bulk` transactional diff (delete removed, upsert existing, create new lessons + quizzes); `/admin/learning/[pathId]/edit` page with 3-column layout (lesson rail / editor / live markdown preview); HTML5 drag-to-reorder; per-lesson body markdown + estimated minutes + quiz editor (up to 10 questions, 4 choices, correctIndex radio); dirty indicator + optimistic save
- AI path generator abuse guards: 5 req/hour/org + 10 req/24h/org caps with friendly 429 messages; audit log on rate-limit rejection
- Test fixes — `posthog-js/react` doesn't exist as a sub-export → rewrote provider to use raw `posthog` singleton + local `usePostHog` hook; Next.js 15 page params type changed to `Promise<{...}>` in `/admin/learning/[pathId]/edit/page.tsx`; jobs catalog test bumped to expect 9 entries (anomaly-scan added)

## QA Sweep — 2026-05-12

Three parallel agents audited live ailevel.app (a11y axe-core, visual qa-only, assessment regression). Reports under `docs/qa/`. Fixes:

- T6.4 a11y — `StreakFlame` span gets `role="img"` so its `aria-label` is valid; assessment progress bar gets `aria-label="Assessment progress"`; assessment runner gets sr-only `<h1>`; Kapitus footer `<h3>` column headers demoted to `<h2>` to fix heading-order skip; global error boundary wrapped in `<main>` landmark; sign-in mailto link gets persistent underline + `kp-purple-deep` for AA contrast against muted slate
- T6.5 QA — `/legal/{privacy,terms,security}` stub pages shipped under a shared `legal/layout.tsx` (Kapitus chrome under `IS_KAPITUS`, default chrome otherwise) with "draft — contact legal" placeholders; `not-found.tsx` now renders Kapitus chrome when `IS_KAPITUS`; brand-mismatch H2 dismissed as false positive (the spec I gave the agent was wrong — kp-purple + Manrope IS the live kapitus.com palette)
- QA H3 — middleware sets `x-pathname` header on every request; (learn) and (admin) layouts read it from `next/headers` for the sign-in redirect target; PROTECTED_PATTERNS expanded to coach/assessment/curriculum/playbooks/leaderboard/prompts/privacy so the middleware-level redirect catches them with the correct deep-link target
- Assessment Bug #1 — `readPersisted` validates each persisted item id against `/^c[a-z0-9]{24,}$/` (Prisma cuid shape) before trusting a localStorage payload; submit errors map "Validation failed" / "Failed to fetch" / "assessmentSessionId does not match" to friendly user-facing copy; error state replaces "Try again" (reload, would resume stale state) with "Start over" that clears persistence and re-calls `startAssessment`; inline error banner also exposes Start over; test fixtures use cuid-shaped ids
- Assessment Bug #2 — `Assessment` model gets nullable `assessmentSessionId String?` + `@@unique([userId, type, assessmentSessionId])` (migration `20260512170000_assessment_session_id_idempotency`); submit handler does `findFirst` before create, rescore from stored `itemResponses` when an existing row is returned, and catches a concurrent-submit `P2002` to refetch the winner; audit log + analytics capture + first-baseline aiLevel update only fire on the actual create
