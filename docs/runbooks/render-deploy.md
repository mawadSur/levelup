# Render Deploy Runbook

Step-by-step for shipping the LevelUp API + worker to Render. The Render API requires a one-time dashboard step to authorize GitHub access — after that, redeploys are CLI-driven via `scripts/render-status.sh` for status and `git push` for code.

## Prerequisites

- GitHub repo at `mawadSur/levelup` (already done)
- Supabase project `uozxalbkvrmlbgjirjbb` running (already done)
- Real values in `.env` for: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CERT_SIGNING_SECRET`
- An Upstash Redis instance in `us-west-2` (or another `oregon`-adjacent region for low latency to Supabase). Free tier is fine for testing.

## Step 1 — Provision Upstash Redis (~3 min)

1. Open https://console.upstash.com/redis
2. Click **Create Database** → name `levelup-prod-redis` → region **us-west-2** (Oregon) → **Pro Free** plan
3. After creation, click the database → **Connect** tab → copy the `redis://` URL (the **TLS** version, starts with `rediss://` for production)
4. Save this URL — you'll paste it as `REDIS_URL` in step 4

## Step 2 — Open Render and apply the Blueprint (~2 min)

1. Open https://dashboard.render.com/blueprints
2. Click **New Blueprint Instance**
3. **Connect GitHub** if you haven't — *Configure account* → grant Render access to `mawadSur/levelup`
4. Pick the `levelup` repo, branch `main`. Render auto-detects `render.yaml` at the repo root.
5. Click **Apply** at the bottom of the detected service list. Render shows two services it'll create: `levelup-api` (web) + `levelup-worker` (worker)

## Step 3 — Paste env vars (~5 min)

Render lists every `sync: false` env var that needs a value. Paste from `.env`:

| Var | Both services | Source |
|---|---|---|
| `DATABASE_URL` | both | `.env` (Supabase pooler 6543) |
| `DIRECT_DATABASE_URL` | both | `.env` (Supabase pooler 5432) |
| `REDIS_URL` | both | step 1 (Upstash, prefer `rediss://`) |
| `SUPABASE_URL` | both | `https://uozxalbkvrmlbgjirjbb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | both | `.env` |
| `OPENAI_API_KEY` | both | `.env` |
| `RESEND_API_KEY` | both | resend.com (verify domain `ailevel.app` first) |
| `RESEND_FROM_EMAIL` | both | `hello@ailevel.app` (or whatever you verify) |
| `SUPABASE_ANON_KEY` | api only | `.env` |
| `SUPABASE_JWT_SECRET` | api only | leave blank (project uses JWKS) |
| `STRIPE_SECRET_KEY` | api only | `.env` (start with **test** key, switch to live later) |
| `STRIPE_WEBHOOK_SECRET` | api only | leave blank for now — set in step 7 |
| `STRIPE_PRICE_*` (6 vars) | api only | run `scripts/setup-stripe-products.ts` first (step 6) |
| `NEXT_PUBLIC_API_URL` | api only | leave blank — set after step 5 |

Render auto-generates `CERT_SIGNING_SECRET` (and `SESSION_SECRET`) on the API service; the worker reads `CERT_SIGNING_SECRET` via `fromService` so they stay in sync.

## Step 4 — Click Apply, wait ~5 min for first build

Render builds both services. Watch logs in the dashboard.

Common first-build failures and fixes:
- **`pnpm install --frozen-lockfile` fails** — the lockfile is out of sync. Push `pnpm install && git add pnpm-lock.yaml && git commit -m "chore: update lockfile" && git push`. Render rebuilds automatically.
- **`prisma generate` fails** — `DATABASE_URL` is missing. Re-paste in env settings.
- **API health check `/api/health` returns 5xx** — env var missing at boot. Service logs show which one. Add it, click **Manual Deploy → Deploy latest commit**.

## Step 5 — Capture API URL + wire to Vercel (~2 min)

1. After `levelup-api` is **Live**, copy its URL (something like `https://levelup-api-xxxx.onrender.com`)
2. Update Vercel env:
   ```
   cd /Users/mawad/Desktop/aiSchool
   vercel env rm NEXT_PUBLIC_API_URL production --yes
   vercel env add NEXT_PUBLIC_API_URL production --value "https://levelup-api-xxxx.onrender.com" --yes
   vercel deploy --prod --yes
   ```
3. Also paste the Render URL back into Render's `levelup-api` env vars as `NEXT_PUBLIC_API_URL` (the API uses it for some redirect URLs). Render redeploys automatically when you save.

## Step 6 — Provision Stripe products (~2 min)

```bash
cd /Users/mawad/Desktop/aiSchool
# Use TEST mode first
export STRIPE_SECRET_KEY=sk_test_xxx
pnpm exec tsx scripts/setup-stripe-products.ts
# Outputs STRIPE_PRICE_* env vars to stdout. Copy each into Render's API service env.
# After verifying in Stripe test dashboard, re-run with --live for production:
export STRIPE_SECRET_KEY=sk_live_xxx
pnpm exec tsx scripts/setup-stripe-products.ts --live
```

Paste the output `STRIPE_PRICE_*` values into Render's `levelup-api` service env. Save → Render redeploys.

## Step 7 — Stripe webhook (~2 min)

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://levelup-api-xxxx.onrender.com/api/webhooks/stripe`
3. Events to listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. After creating, click the endpoint → **Signing secret** → copy
5. Paste as `STRIPE_WEBHOOK_SECRET` in Render's `levelup-api` service env. Save → Render redeploys.

## Step 8 — Verify (~3 min)

```bash
# API health
curl https://levelup-api-xxxx.onrender.com/api/health
# Expect: {"status":"ok"}

# Status of both services
RENDER_API_KEY=rnd_xxx ./scripts/render-status.sh

# Web → API roundtrip
curl https://ailevel.app/  # 200
# Sign up via the web UI, confirm an org is created in Supabase
```

## Ongoing

- Auto-deploys on every push to `main` (both services watch the same repo)
- Roll back via Render dashboard → service → **Deploys** → previous → **Redeploy**
- Monitor with `scripts/render-status.sh` (returns non-zero exit if any service is unhealthy — wire into status checks)

## When something breaks

- **Worker not picking up jobs** — Redis URL mismatch between API and worker. Both must point at the SAME Upstash database.
- **Coach calls timing out** — `OPENAI_API_KEY` missing or rate-limited. Check service logs.
- **Webhook signature verification failing** — `STRIPE_WEBHOOK_SECRET` is from the old endpoint. Regenerate in Stripe dashboard, paste fresh value.
- **Stripe checkout returns "stub mode" error** — `STRIPE_SECRET_KEY` is still `PLACEHOLDER_*`. Update with real key.
