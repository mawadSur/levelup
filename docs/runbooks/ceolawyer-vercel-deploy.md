# Runbook — Deploy `ceolawyer.ailevel.app`

Stand up the **CEO Lawyer** tenant as a second Vercel project that builds the same
`apps/web` Next.js app from the same repo + branch, with `NEXT_PUBLIC_CLIENT=ceolawyer`
so the build-time branding switch in `apps/web/src/lib/client.ts` flips to the
CEO Lawyer chrome.

## Why two projects instead of one

Vercel does not support per-domain env vars on a single deployment. The branding
switch (`IS_KAPITUS`, etc.) is resolved at build time and inlined into the
client bundle. Path A — **one repo, two Vercel projects** — keeps every existing
`IS_KAPITUS` usage untouched and is fully reversible. The trade-off is one extra
build per push-to-main; that cost is acceptable until per-organization branding
lands (see "Phase 2" at the bottom).

Decision recorded: **Path A**, taken on 2026-05-13.

---

## Prerequisites

- Admin access to the Vercel team that owns the existing `levelup-web` project.
- Admin access to the DNS provider for `ailevel.app`, OR admin of the Vercel
  team that controls `ailevel.app` if the apex is already on Vercel.
- The Render API at `https://api.ailevel.app` (or whichever URL the existing
  Vercel project sets as `NEXT_PUBLIC_API_URL`) is already live — both tenants
  share one API.

---

## Step 1 — Create the second Vercel project

1. In the Vercel dashboard, click **Add New… → Project**.
2. Import the same Git repo as the existing `levelup-web` project
   (`mawadSur/levelup` or whatever the canonical name is — match the existing
   project's source).
3. **Project name:** `levelup-web-ceolawyer` (suggested; anything you like).
4. **Framework Preset:** Next.js (auto-detected).
5. **Root Directory:** `apps/web`.
6. **Build & Output Settings:** leave Vercel's defaults; the project's
   `apps/web/vercel.json` is committed at the repo root for `apps/web` and
   already specifies `buildCommand`, `installCommand`, `outputDirectory`,
   `framework`, and `regions`. The committed `vercel.json` defaults to
   `kapitus` — the env-var overrides in Step 2 will flip it to `ceolawyer`.
7. **Do not deploy yet** — finish env vars first. If Vercel forces an initial
   deploy, that's fine; it will produce a kapitus-branded build that you'll
   overwrite once env vars are set.

The committed file `apps/web/vercel.ceolawyer.json` is a documentation template
showing the intended config — Vercel does not consume per-environment JSON
files, so the values inside it must be entered via the dashboard.

## Step 2 — Set environment variables (Production AND Preview)

In **Project Settings → Environment Variables**, add these for both
**Production** and **Preview**:

| Key                   | Value                           |
| --------------------- | ------------------------------- |
| `NEXT_PUBLIC_CLIENT`  | `ceolawyer`                     |
| `CLIENT`              | `ceolawyer`                     |
| `NEXT_PUBLIC_APP_URL` | `https://ceolawyer.ailevel.app` |

Then **copy every other env var** from the existing `levelup-web` project
EXCEPT the three above. The fastest way is:

1. Open the existing `levelup-web` project → Settings → Environment Variables.
2. Click **⋯ → Export** (or hand-copy each entry).
3. Import / paste into the new project.
4. Remove or replace the three overridden keys with the values above.

Required vars to confirm are present (non-exhaustive — match the existing
project as source of truth):

- `NEXT_PUBLIC_API_URL` — same Render API URL as kapitus (both tenants share one API).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (if used server-side by the web app)
- `SESSION_SECRET`
- Any analytics / PostHog keys
- Any Stripe publishable key

## Step 3 — Attach the domain

1. In the new project → **Settings → Domains** → **Add**.
2. Enter `ceolawyer.ailevel.app`.
3. Vercel will show one of two outcomes:

   **(a) `ailevel.app` is already on Vercel under the same team.**
   Vercel attaches the subdomain automatically and provisions TLS. Done.

   **(b) `ailevel.app` DNS is elsewhere.**
   Vercel will display the DNS record you must add at the registrar:
   - **Type:** `CNAME`
   - **Name:** `ceolawyer`
   - **Value:** `cname.vercel-dns.com.`
   - **TTL:** default (3600 or "auto")

   After the record propagates (usually < 5 min, up to 48 h), Vercel will issue
   a Let's Encrypt cert automatically.

## Step 4 — Deploy

1. Trigger a deploy: Vercel dashboard → new project → **Deployments** →
   **Redeploy** (or push any commit to `main`).
2. Wait for the build. Confirm in the build log that the env var
   `NEXT_PUBLIC_CLIENT=ceolawyer` is present.
3. Visit `https://ceolawyer.ailevel.app/`. The marketing root should render the
   CEO Lawyer chrome (provided by Agent C1's brand config).

## Step 5 — Verify API CORS

The API at `apps/api/src/main.ts` reads `WEB_ORIGIN` (comma-separated) and
passes it directly to `app.enableCors({ origin: origins, credentials: true })`.

In **Render → levelup-api → Environment**, ensure `WEB_ORIGIN` is set to:

```
https://ailevel.app,https://ceolawyer.ailevel.app
```

(The committed `render.yaml` is the source of truth — it now sets this value.
Render only re-reads `render.yaml` on a manual "Sync" or new service creation,
so update the env var in the dashboard manually as well, then redeploy the
API.)

Smoke-test from the new domain:

```bash
curl -i -X OPTIONS https://api.ailevel.app/api/health \
  -H 'Origin: https://ceolawyer.ailevel.app' \
  -H 'Access-Control-Request-Method: GET'
```

Expect `Access-Control-Allow-Origin: https://ceolawyer.ailevel.app` in the
response headers.

## Step 6 — Smoke test the full flow

1. `https://ceolawyer.ailevel.app/` → CEO Lawyer marketing page (from C1).
2. `https://ceolawyer.ailevel.app/sign-in` → sign-in page renders with CEO Lawyer chrome.
3. Sign in as a CEO Lawyer tenant user → routed to `/learn`. Verify legal
   curriculum is visible (from C2).
4. `https://ailevel.app/` → unchanged Kapitus marketing page (regression check).

---

## Rollback

To take `ceolawyer.ailevel.app` offline without affecting Kapitus:

1. Remove the domain from the ceolawyer Vercel project, OR
2. Pause the ceolawyer Vercel project (Settings → General → bottom of page).

Kapitus traffic on `ailevel.app` is unaffected because it is served by the
original Vercel project.

---

## Phase 2 — per-organization branding for emails + cert PDFs (out of scope for v1)

The worker at `apps/worker/` reads `CLIENT` once at process start
(`apps/worker/src/config.ts` and `apps/worker/src/cert/pdf.ts`). It runs as a
**single Render service** with one `CLIENT` env (currently `kapitus`), so:

- Certificate PDFs for CEO Lawyer users will render with Kapitus chrome
  (logo, brand colors, academy name).
- Outbound emails ("path assigned", "cert ready", etc.) inherit whatever
  brand strings the worker uses.

**v1 acceptance:** this is a known cosmetic mismatch. CEO Lawyer users see
correct branding in the web app and incorrect branding in PDFs / emails until
phase 2 ships.

**Phase 2 plan (not in this runbook's scope):**

1. Add `Organization.client: String` (or `Organization.brand: String`) to
   `packages/db/prisma/schema.prisma`.
2. Backfill: every existing org → `kapitus`; CEO Lawyer org(s) → `ceolawyer`.
3. Worker resolves `client` per job from the org row (not from the env var):
   `apps/worker/src/cert/pdf.ts` accepts `client` as an argument; the cert
   job payload includes `organizationId`; the handler loads the org and
   passes its `client` down.
4. Same pattern for any email-template branding.
5. Web stays build-time; the per-tenant deployment model in this runbook is
   still correct because the web bundle is served from different domains.
