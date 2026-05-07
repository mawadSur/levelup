# Supabase setup runbook

How to point LevelUp AI Academy at a Supabase Postgres project. ~10 minutes end to end.

## 1. Create the project

1. Sign in at https://supabase.com/dashboard.
2. **New project** → pick a region close to your API deployment region (Render Oregon → Supabase `us-west-1`; Vercel `iad1` → Supabase `us-east-1`). Cross-region RTT is the single biggest preventable performance hit.
3. Set a strong DB password and stash it in your password manager. You cannot retrieve it later — only reset.
4. Wait ~2 minutes for the project to provision.

## 2. Enable required extensions

LevelUp depends on three Postgres extensions:

| Extension  | Why we need it                                           |
| ---------- | -------------------------------------------------------- |
| `vector`   | Lesson + prompt embeddings for semantic search           |
| `pg_trgm`  | Trigram similarity for the text-fallback search path     |
| `pgcrypto` | Random ID + bytea utilities used by gamification helpers |

Two ways to enable, pick one:

**A. Dashboard (recommended for first-time setup):**
Database → Extensions → search and toggle each of `vector`, `pg_trgm`, `pgcrypto` to **enabled**.

**B. SQL editor:**
Paste `infra/supabase/init.sql` into Database → SQL Editor → Run.

The Prisma init migration also runs `CREATE EXTENSION IF NOT EXISTS` for each — but enabling them via the dashboard first avoids a permission edge case on Supabase's restricted role.

## 3. Get the connection strings

Project Settings → Database → **Connection string**. You need two:

### `DATABASE_URL` (runtime, pooled)

Click the **Transaction** tab.

```
postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

- **Port 6543** = transaction-mode pgBouncer pool. Cheap, lots of concurrent connections, no prepared statements.
- `?pgbouncer=true` tells Prisma to skip prepared statements (required for pgBouncer transaction mode).
- `connection_limit=1` is the right per-process default for serverless. For the long-lived NestJS api on Render/Fly, you can omit it or bump to a small number (4–10).

### `DIRECT_DATABASE_URL` (migrations, direct)

Click the **Session** tab.

```
postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

- **Port 5432** = session pool that supports DDL, prepared statements, and `prisma migrate`.
- Used ONLY by `prisma migrate dev|deploy` and `prisma db push`. Runtime queries always go through `DATABASE_URL`.

## 4. Set the env vars

Locally, in `.env.local`:

```bash
DATABASE_URL="postgres://postgres.abcdefgh:S0meP@ssw0rd@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_DATABASE_URL="postgres://postgres.abcdefgh:S0meP@ssw0rd@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

In production (Render):

- Settings → Environment → add both vars to the `levelup-api` and `levelup-worker` services.
- Mark both as `sync: false` so they aren't echoed in logs.

In production (Fly):

```bash
fly secrets set -a levelup-api DATABASE_URL="..." DIRECT_DATABASE_URL="..."
fly secrets set -a levelup-worker DATABASE_URL="..." DIRECT_DATABASE_URL="..."
```

## 5. Apply migrations

```bash
pnpm db:generate
pnpm db:migrate     # applies prisma/migrations/* via the DIRECT_DATABASE_URL
```

If this is your first migration on Supabase, it will apply the entire history (init + every subsequent migration). Expect ~10–30 seconds.

## 6. Seed (optional, for demo/dev)

```bash
pnpm db:seed
```

This creates a demo org, 4 users, 3 paths × 3 lessons × quizzes. Safe to re-run — uses upserts.

## 7. Verify

```bash
pnpm db:studio
```

Opens Prisma Studio at http://localhost:5555 against the configured database. You should see ~25 tables with seed data populated.

## 8. Smoke-test from the api

```bash
pnpm dev
```

Then `curl http://localhost:4000/api/health` → expects `{ "status": "ok" }`. The `ready` endpoint pings the DB connection too.

---

## Things that go wrong

### "no pg_hba.conf entry for ... SSL off"

Supabase requires SSL. Append `&sslmode=require` to both URLs if your client doesn't add it automatically.

### "prepared statement \"s0\" already exists"

You're using `DATABASE_URL` (the pooler) for migrations. Migrations MUST go through `DIRECT_DATABASE_URL`. Double-check your env.

### "permission denied to create extension"

You enabled extensions via the SQL editor as a non-superuser. Use the Database → Extensions UI instead, or re-run as the `postgres` role.

### "remaining connection slots are reserved for non-replication superuser connections"

Your runtime connection-pool size is too high. With pgBouncer transaction mode, you can have many more app processes than direct connections. Set `connection_limit=1` in the URL and let pgBouncer handle the multiplexing.

### Slow queries after migration

First-query latency on a fresh project is high while Supabase compiles plans. It settles within a few requests.

### Backups

Supabase Pro plan and above includes daily PITR backups (7-day window default). Configure in Project Settings → Database → Backups. The general restore drill in `docs/runbooks/postgres-backup.md` applies — substitute Supabase's branching/restore UI for the manual `pg_restore` flow.

---

## Owner

VP Engineering. Reviews quarterly when DB plan / region / extension list changes.
