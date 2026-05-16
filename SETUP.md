# SETUP — Accounts & Keys

This codebase tolerates `PLACEHOLDER_*` values for every external integration — anything left as a placeholder runs in **stub mode** (logs the call, returns a deterministic mock). To go live with a feature, replace the placeholder in `.env.local`.

## Order of operations

1. **Local infra (free, required):** `docker compose -f infra/docker-compose.yml up -d` — Postgres+pgvector + Redis.
2. **OpenAI (required for real AI coach + assessments):** create a project key → `OPENAI_API_KEY`.
3. **Supabase Auth (required for real auth):** create a project at supabase.com → Project Settings → API → copy URL + `anon` key + `service_role` key → set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus the matching `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the web bundle. Optionally set `SUPABASE_JWT_SECRET` for legacy HS256 projects (modern projects validate via JWKS). Then in Authentication → URL Configuration add `http://localhost:3000` (and your production domain) to the Redirect URLs allowlist for magic links to work.
4. **Stripe (required for billing):** create three products with monthly prices ($499 / $1,499 / $5,000) → set `STRIPE_*` vars + the three price IDs.
5. **Resend (required for invitations / cert email):** API key → `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
6. **Sentry (optional — error tracking):** see "Sentry (error tracking)" below. Leaving `SENTRY_DSN` unset (or set to `PLACEHOLDER_…`) is fully supported — the SDK becomes a no-op in that case, so dev / CI / staging boots never crash on missing telemetry config.

## Stub mode behaviour

| Env var                              | When stubbed                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENAI_API_KEY`                     | Coach responses are a canned "Stub mode — set OPENAI_API_KEY to enable real responses." Embeddings return zero vectors.                                                                                                                                                                                                                    |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Auth runs in dev-bypass mode. `GET /api/auth/dev-bypass?email=…` mints a Supabase-shaped JWT signed with a local stub secret, which the API verifies the same way as a real Supabase token. The web sign-in form auto-detects stub mode and skips the password field. DO NOT ship to prod stubbed (`NODE_ENV=production` refuses to boot). |
| `STRIPE_*`                           | Checkout links return a fake URL. Webhooks are no-ops. Plan stays on `starter`.                                                                                                                                                                                                                                                            |
| `RESEND_API_KEY`                     | Emails are written to `apps/api/.outbox/` as `.eml` files instead of sent.                                                                                                                                                                                                                                                                 |

## Production setup

### Web — Vercel

`apps/web/vercel.json` is wired up. From the Vercel dashboard:

1. Import the repo, select `apps/web` as the root directory.
2. Vercel detects Next.js automatically; the build/install commands in `vercel.json` run from the monorepo root.
3. Add env vars (Production scope): `NEXT_PUBLIC_API_URL` (your API hostname), `NEXT_PUBLIC_APP_URL` (your web hostname). All other secrets stay on the API side.
4. Set the production domain. Update Supabase Authentication → URL Configuration → Redirect URLs to include the production web origin so magic-link callbacks land on the right host.

### API + Worker — Render (recommended) or Fly

**Render:** full step-by-step in [`docs/runbooks/render-deploy.md`](./docs/runbooks/render-deploy.md). Quick version:

1. Provision Upstash Redis in `us-west-2` (free tier is fine).
2. Open https://dashboard.render.com/blueprints → New Blueprint → connect `mawadSur/levelup` → Apply. Render reads `render.yaml` at repo root and creates two services: `levelup-api` + `levelup-worker`.
3. Paste `sync: false` env vars from `.env`. `CERT_SIGNING_SECRET` auto-generates on the API and the worker reads it via `fromService`.
4. Run `pnpm exec tsx scripts/setup-stripe-products.ts` (test mode default; `--live` for prod) to provision Stripe products + prices. Paste output `STRIPE_PRICE_*` values into Render's API service.
5. Wire the Stripe webhook to `https://<api-url>/api/webhooks/stripe` in Stripe dashboard, paste signing secret as `STRIPE_WEBHOOK_SECRET`.
6. Update Vercel `NEXT_PUBLIC_API_URL` to the Render API URL, redeploy web.
7. Monitor with `RENDER_API_KEY=rnd_xxx ./scripts/render-status.sh` (returns non-zero on unhealthy).

**Fly:** `infra/fly.api.toml` and `infra/fly.worker.toml` plus `Dockerfile.api` / `Dockerfile.worker`. From the repo root:

```bash
fly launch --config infra/fly.api.toml --dockerfile infra/Dockerfile.api --no-deploy
fly secrets set -a levelup-api DATABASE_URL=... REDIS_URL=... OPENAI_API_KEY=...  # etc.
fly deploy --config infra/fly.api.toml --dockerfile infra/Dockerfile.api

fly launch --config infra/fly.worker.toml --dockerfile infra/Dockerfile.worker --no-deploy
fly secrets set -a levelup-worker DATABASE_URL=... REDIS_URL=... OPENAI_API_KEY=...
fly deploy --config infra/fly.worker.toml --dockerfile infra/Dockerfile.worker
```

### Postgres — Supabase (recommended)

Full walk-through in [`docs/runbooks/supabase-setup.md`](./docs/runbooks/supabase-setup.md). For Claude Code MCP integration with your Supabase project, see [`.claude/README.md`](./.claude/README.md). Quick version:

1. Create a project. Pick a region close to your API deploy region.
2. Database → Extensions → enable `vector`, `pg_trgm`, `pgcrypto` (or paste `infra/supabase/init.sql` into the SQL editor).
3. Project Settings → Database → Connection string:
   - `DATABASE_URL` = **Transaction pooler** (port 6543, append `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_DATABASE_URL` = **Session pooler** OR direct (port 5432) — used by Prisma migrations
4. `pnpm db:generate && pnpm db:migrate && pnpm db:seed`.

### Postgres — Neon (alternative)

1. Create a project, enable the `vector` extension (`CREATE EXTENSION IF NOT EXISTS vector;`) on the main database.
2. Use a separate branch per environment (preview, staging, production).
3. `DATABASE_URL` = pooled endpoint (`...-pooler...`); `DIRECT_DATABASE_URL` = direct endpoint.
4. The init migration handles `pg_trgm`, `pgcrypto`, `vector` — confirm they're enabled before running migrations.

### File storage — Supabase Storage

Certificate PDFs and uploaded company-policy files are persisted to private
Supabase Storage buckets. Both buckets are accessed exclusively from the
server side using the service-role key (`@levelup/storage` wraps the client),
so no RLS policies are required.

1. Create the buckets (one-time):

   ```bash
   curl -X POST \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     "$SUPABASE_URL/storage/v1/bucket" \
     -d '{"id":"certificates","name":"certificates","public":false}'

   curl -X POST \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     "$SUPABASE_URL/storage/v1/bucket" \
     -d '{"id":"policy-files","name":"policy-files","public":false}'
   ```

2. Set the env vars:
   - `SUPABASE_URL=https://<project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<from Project Settings → API>`
3. Object key conventions:
   - Certificates: `<orgId>/<certId>.pdf` in bucket `certificates`. Persisted
     as `Certificate.storagePath`. `Certificate.pdfUrl` stores a 7-day signed
     URL minted at upload time; `GET /api/certificates/:id/file` mints a
     fresh signed URL on each request and 302-redirects.
   - Policy files: `<orgId>/<policyVersionId>__<safeName>` in bucket
     `policy-files`. Persisted as `CompanyPolicy.fileStoragePath`.
4. Stub mode: when `SUPABASE_SERVICE_ROLE_KEY` is unset or `PLACEHOLDER_*`,
   `@levelup/storage` falls back to local filesystem
   (`apps/api/.cert-output/<id>.pdf`) and returns `file://` URLs. The
   certificates controller detects stub mode and streams from disk on
   `GET /api/certificates/:id/file` so the demo flow keeps working.

### File storage — Cloudflare R2 (preferred for cert PDFs)

Certificate PDFs can be persisted to a Cloudflare R2 bucket instead of
Supabase Storage. When R2 is configured, `@levelup/storage` uses it
automatically for new uploads and signs all download URLs with the S3
v4 presigner. R2 is preferred for production because it has no egress fees
and is fronted by Cloudflare's CDN out of the box. Setup:

1. Create an R2 bucket in the Cloudflare dashboard (e.g., `levelup-certs`).
2. Account → R2 → Manage R2 API Tokens → Create API token with
   "Object Read & Write" permission scoped to that bucket.
3. Set the env vars (API + worker; same values on both services):
   - `R2_ACCOUNT_ID=<from Cloudflare dashboard URL>`
   - `R2_ACCESS_KEY_ID=<from token creation>`
   - `R2_SECRET_ACCESS_KEY=<from token creation>`
   - `R2_BUCKET=levelup-certs`
   - `R2_PUBLIC_BASE_URL=` _(optional — only used if you front R2 with a
     custom domain; the signed URL flow does not need this)_
4. Object key shape is identical to the Supabase path:
   `<orgId>/<certId>.pdf`. Existing Supabase rows can stay where they are
   and the controller will sign whichever backend the new env-var matrix
   points at (`getCertificateSignedUrl` reads `storagePath` and routes
   based on `isR2Configured()`).
5. Backend priority: R2 (if configured) → Supabase Storage → local fs stub.
   Leaving any of the four required `R2_*` env vars unset or starting with
   `PLACEHOLDER_` keeps the prior path active, so existing deployments
   keep working unchanged.
6. Signed URL TTL: 15 min default for R2 (matches the typical
   email-click roundtrip), capped at 7d. The Supabase path still mints
   7-day URLs for backward compatibility.

### Sentry (error tracking)

Skeleton wiring is in place across all three runtime processes:

- `apps/web` — Next.js Sentry SDK (`@sentry/nextjs`) via `sentry.client.config.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts` + `instrumentation.ts`.
- `apps/api` — Node SDK (`@sentry/node`) initialised in `apps/api/src/observability/sentry.ts`; wired from `main.ts` BEFORE the OTel `./observability/start` import so Sentry's auto-instrumentation sees an unpatched Node core.
- `apps/worker` — same shape as the API at `apps/worker/src/observability/sentry.ts`.

All three init paths short-circuit (no-op) when `SENTRY_DSN` is unset or starts with `PLACEHOLDER_` — there is no boot-time crash in dev / CI / staging without telemetry.

To provision a project:

1. Sign in to https://sentry.io, create an organisation (or reuse one).
2. Create three projects from the dashboard ("+ New Project"):
   - Platform: **Next.js** — name `levelup-web`.
   - Platform: **Node.js** — name `levelup-api`.
   - Platform: **Node.js** — name `levelup-worker`.
3. Copy each project's DSN from Settings → Client Keys (DSN). They look like `https://<key>@<region>.ingest.sentry.io/<project-id>`.
4. Paste them into your env matrix:
   - `apps/web` (Vercel → Production env): `NEXT_PUBLIC_SENTRY_DSN=<web dsn>` plus `SENTRY_DSN=<web dsn>` for the server runtime. Optionally `SENTRY_ENVIRONMENT=production`. Default sample rate is `0.1`; override with `SENTRY_TRACES_SAMPLE_RATE`.
   - `apps/api` and `apps/worker` (Render → both services have placeholders pre-wired in `render.yaml`): `SENTRY_DSN=<respective dsn>`, optional `SENTRY_ENVIRONMENT`, optional `SENTRY_TRACES_SAMPLE_RATE`.
5. Verify in Sentry → Issues that errors arrive after the next deploy.

PII scrubbing is now wired in each `Sentry.init` via `beforeSend` (email, IP, auth headers, request bodies on `/api/auth/*` + `/api/users/*`, plus recursive scrubbing of `password` / `token` / `secret` / `apiKey` keys in `event.extra` / `event.contexts`).

#### Source-map upload (apps/web only)

`apps/web` now has a `postbuild` script that runs `sentry-cli sourcemaps inject` + `sentry-cli sourcemaps upload` against `./.next` **only when `SENTRY_AUTH_TOKEN` is set**. Without that env var the script logs `skipping sentry sourcemap upload` and exits 0 — CI and local builds stay green.

To enable on Vercel production:

1. Sentry → Settings → Auth Tokens → "Create New Token". Scopes: `project:releases`, `org:read`, `project:read`.
2. In Vercel → Project (`levelup-web`) → Settings → Environment Variables, add **Production** vars:
   - `SENTRY_AUTH_TOKEN=<token from step 1>` (mark as Sensitive)
   - `SENTRY_ORG=<slug from sentry.io/organizations/<slug>/>`
   - `SENTRY_PROJECT=levelup-web`
3. Redeploy. The Vercel build will inject + upload source maps on `postbuild`; the next error in Sentry should show unminified frames.

Source-map upload is only relevant for `apps/web` (Vercel). Render does not need these vars; `apps/api` / `apps/worker` ship as plain TS-compiled JS where stack frames already point at readable source.

#### Alert rules

Alert rules cannot be defined in code without a Sentry integration — see `docs/runbooks/sentry-alerts.md` for the four alerts to configure manually in the Sentry UI.

### Redis — Upstash

1. Create a Global database (low latency from your API region).
2. Use the `rediss://` (TLS) connection string for `REDIS_URL`. The `@levelup/queue` config detects `rediss://` and enables TLS automatically.
3. Production traffic on the Free tier is fine for early pilots; upgrade to Pay-as-you-go before serving real customers.

### DNS / domains

- Web → Vercel (e.g., `app.levelup.example`)
- API → Render or Fly (e.g., `api.levelup.example`)
- Set `NEXT_PUBLIC_API_URL=https://api.levelup.example`
- Set `WEB_ORIGIN=https://app.levelup.example` on the API
- Set `COOKIE_DOMAIN=.levelup.example` so the Supabase auth cookie works across subdomains
- Add `https://app.levelup.example` (and any preview domains) to Supabase Authentication → URL Configuration → Redirect URLs so magic-link callbacks land correctly

### Production environment matrix

| Variable                                                     | Local dev                            | Staging                             | Production                           |
| ------------------------------------------------------------ | ------------------------------------ | ----------------------------------- | ------------------------------------ |
| `NODE_ENV`                                                   | development                          | production                          | production                           |
| `DATABASE_URL`                                               | docker compose (port 5432)           | Supabase pooler / Neon pooled       | Supabase pooler / Neon pooled        |
| `DIRECT_DATABASE_URL`                                        | unset (falls back to `DATABASE_URL`) | Supabase session / Neon direct      | Supabase session / Neon direct       |
| `REDIS_URL`                                                  | docker compose                       | Upstash staging                     | Upstash prod                         |
| `OPENAI_API_KEY`                                             | PLACEHOLDER or real key              | real key                            | real key                             |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY`                         | PLACEHOLDER (uses dev bypass)        | real keys                           | real keys                            |
| `SUPABASE_SERVICE_ROLE_KEY`                                  | PLACEHOLDER (local fs)               | service-role key                    | service-role key (rotated yearly)    |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PLACEHOLDER                          | mirror the server values            | mirror the server values             |
| `STRIPE_SECRET_KEY`                                          | PLACEHOLDER                          | test mode key                       | live mode key                        |
| `STRIPE_WEBHOOK_SECRET`                                      | n/a                                  | test webhook secret                 | live webhook secret                  |
| `RESEND_API_KEY`                                             | PLACEHOLDER (writes .eml)            | real key, sandbox domain            | real key, verified domain            |
| `SESSION_SECRET`                                             | optional                             | 32+ random chars                    | 32+ random chars (rotated quarterly) |
| `COOKIE_DOMAIN`                                              | localhost                            | `.staging.levelup.example`          | `.levelup.example`                   |
| `WEB_ORIGIN`                                                 | http://localhost:3000                | https://app.staging.levelup.example | https://app.levelup.example          |
| `NEXT_PUBLIC_API_URL`                                        | http://localhost:4000                | https://api.staging.levelup.example | https://api.levelup.example          |
| `SENTRY_DSN` (+ `NEXT_PUBLIC_SENTRY_DSN` on web)             | unset / PLACEHOLDER (no-op)          | staging DSN                         | production DSN                       |
| `SENTRY_ENVIRONMENT`                                         | unset (falls back to `NODE_ENV`)     | `staging`                           | `production`                         |
| `SENTRY_TRACES_SAMPLE_RATE`                                  | unset (default `0.1`)                | `0.1`                               | `0.1`                                |
| `SENTRY_AUTH_TOKEN` (web only, Vercel)                       | unset                                | optional                            | set (enables source-map upload)      |
| `SENTRY_ORG` (web only, Vercel)                              | unset                                | optional                            | Sentry org slug                      |
| `SENTRY_PROJECT` (web only, Vercel)                          | unset                                | optional                            | `levelup-web`                        |

Stub mode is allowed in local + staging. In production, every `PLACEHOLDER_*` value will throw at boot — the relevant package's `config.ts` enforces this.

## Smoke test after setup

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then:

1. Visit http://localhost:3000 → marketing landing renders.
2. Sign up as a new org → admin dashboard loads.
3. `/coach` returns either real or stub responses based on your OpenAI key.
4. `/admin/people` allows inviting a teammate (real or stub email).

If anything 500s, check `pnpm dev` output and the structured logs from the API.
