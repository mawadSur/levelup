# Postgres Backup & Restore Runbook

**Owner:** VP Engineering  
**Review cadence:** Quarterly (March · June · September · December)  
**Last reviewed:** 2026-Q2

---

## 1. Why this exists

Backups exist so we can restore. That's it. No heroics required — just known, tested procedures executed when the time comes. We test restores quarterly so we know they work before we need them.

This document covers:

- how our production database is backed up automatically,
- how self-hosted (dev/pilot) dumps are managed,
- exactly how to run a restore drill, and
- step-by-step procedures for the two most likely disaster scenarios.

---

## 2. Backup configuration

### 2a. Neon (production)

LevelUp AI Academy production runs on [Neon](https://neon.tech). Neon provides built-in **point-in-time recovery (PITR)** at the storage layer — no pg_dump cron required.

| Plan tier | PITR window | Branch limit |
| --------- | ----------- | ------------ |
| Scale     | 7 days      | 10           |

> **Current plan:** Scale. Recovery window = **7 days** of continuous WAL history.

PITR granularity is approximately **5 minutes** (the time between WAL checkpoints). This is our RPO target (see §6).

Backups are managed by Neon and visible in the Neon console under **Project → Branches → Restore**. They are also accessible via the [Neon REST API](https://api-docs.neon.tech/reference/restore-branch).

You do not need to schedule anything for production — Neon handles it.

### 2b. Self-hosted Postgres (dev / pilot deployments)

For dev and pilot environments that run their own Postgres instance, a daily logical dump is scheduled via cron:

```cron
# /etc/cron.d/levelup-pg-backup
0 2 * * * postgres pg_dump --format=custom --jobs=4 \
    --file=/backups/$(date +%F).dump \
    "$DATABASE_URL" \
  && gzip /backups/$(date +%F).dump \
  && aws s3 cp /backups/$(date +%F).dump.gz \
       s3://levelup-backups-prod/postgres/$(date +%F).dump.gz \
  && rm /backups/$(date +%F).dump.gz
```

- **Schedule:** 02:00 UTC daily (off-peak).
- **Format:** `--format=custom` (compressed, parallelisable for restore).
- **Jobs:** 4 parallel dump threads (`--jobs=4`).
- **Local file:** `/backups/YYYY-MM-DD.dump` — deleted after S3 upload.

---

## 3. Where backups live

### Neon (production)

- **Where:** Neon-managed storage, replicated across availability zones.
- **Access:** Neon console → Project → Branches → Restore, or via Neon API.
- **Visibility:** only members with `Owner` or `Admin` role on the Neon project.
- **No additional setup needed** — Neon retains WAL automatically.

### S3 (self-hosted backup target)

| Attribute    | Value                                               |
| ------------ | --------------------------------------------------- |
| Bucket       | `s3://levelup-backups-prod/postgres/`               |
| File pattern | `YYYY-MM-DD.dump.gz`                                |
| Encryption   | AES-256 SSE (server-side, S3-managed keys)          |
| Retention    | 90-day lifecycle rule (S3 Object Lifecycle policy)  |
| Region       | Same region as primary compute                      |
| Access       | IAM role `levelup-backup-restore` (least-privilege) |

To download a specific day's backup:

```bash
aws s3 cp s3://levelup-backups-prod/postgres/2026-05-01.dump.gz /tmp/
gunzip /tmp/2026-05-01.dump.gz
```

---

## 4. Restore drill (quarterly)

Run this drill at the start of each quarter. Document the result in the quarterly journal (see §4 step 5).

**Prerequisites:**

- A fresh Postgres instance (version matches production — check `SELECT version();`).
- IAM credentials with read access to `s3://levelup-backups-prod`.
- `pg_restore` CLI matching the dump's Postgres major version.
- Access to the Neon project (for production PITR drills).

### Steps

**Step 1 — Provision a test database**

For Neon drills, create a branch from the desired recovery timestamp:

```bash
# Neon CLI
neon branches create \
  --name "restore-drill-$(date +%F)" \
  --parent main \
  --timestamp "2026-05-01T02:00:00Z"
```

For self-hosted drills, spin up an empty Postgres:

```bash
docker run -d --name pg-restore-test \
  -e POSTGRES_PASSWORD=testpass \
  -p 5433:5432 \
  postgres:16-alpine

export TEST_URL="postgresql://postgres:testpass@localhost:5433/levelup_test"
createdb -h localhost -p 5433 -U postgres levelup_test
```

**Step 2 — Download the dump (self-hosted path)**

```bash
aws s3 cp s3://levelup-backups-prod/postgres/$(date -d "yesterday" +%F).dump.gz /tmp/
gunzip /tmp/$(date -d "yesterday" +%F).dump.gz
DUMP_PATH="/tmp/$(date -d "yesterday" +%F).dump"
```

**Step 3 — Restore**

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --jobs=4 \
  -d "$TEST_URL" \
  "$DUMP_PATH"
```

Expected output: verbose table creation logs, no `ERROR:` lines.

**Step 4 — Verify with seed-check script**

```bash
# TODO: this script does not yet exist — tracked in backlog
pnpm --filter @levelup/db exec tsx prisma/seed-verify.ts
```

Until that script is implemented, verify manually:

```sql
-- Row count spot-checks
SELECT 'users'       AS tbl, COUNT(*) FROM "User"
UNION ALL
SELECT 'paths',              COUNT(*) FROM "LearningPath"
UNION ALL
SELECT 'enrollments',        COUNT(*) FROM "Enrollment"
UNION ALL
SELECT 'attempts',           COUNT(*) FROM "QuizAttempt"
UNION ALL
SELECT 'certificates',       COUNT(*) FROM "Certificate";
```

Compare counts against production. Acceptable variance: **< 1%** (accounts for writes since backup was taken).

**Step 5 — Document the result**

Add an entry to the quarterly journal (Notion link: *https://notion.so/levelup/backup-restore-drills — placeholder*):

```
Date: YYYY-MM-DD
Conducted by: [name]
Backup date used: YYYY-MM-DD
Restore duration: X minutes
Row count variance: < 1% / FAIL — [details]
Issues encountered: [none / description]
Actions required: [none / ticket link]
```

**Step 6 — Tear down**

```bash
docker rm -f pg-restore-test
# Or: neon branches delete restore-drill-YYYY-MM-DD
```

---

## 5. Recovery procedures

### 5a. Logical corruption (accidental DELETE / bad migration)

**Scenario:** a bad migration or human error destroys or corrupts a table's data. The application is still running but data is wrong.

1. **Identify the incident timestamp.** Note the exact UTC time the bad change was committed (check app logs, Postgres audit logs, or Neon branch activity).

2. **Create a Neon rescue branch** from 5 minutes before the incident:

   ```bash
   INCIDENT_TS="2026-05-01T14:23:00Z"   # adjust
   RESCUE_TS=$(date -u -d "$INCIDENT_TS - 5 minutes" +%Y-%m-%dT%H:%M:%SZ)

   neon branches create \
     --name "rescue-$(date +%F-%H%M)" \
     --parent main \
     --timestamp "$RESCUE_TS"
   ```

3. **Connect to the rescue branch** and export affected rows:

   ```bash
   psql "$RESCUE_DB_URL" -c "\COPY \"Certificate\" TO '/tmp/certs_rescue.csv' CSV HEADER"
   ```

4. **Re-import the rows** into production (verify no duplicate primary keys first):

   ```bash
   psql "$PROD_DB_URL" -c "\COPY \"Certificate\" FROM '/tmp/certs_rescue.csv' CSV HEADER"
   ```

5. **Run smoke tests.** Verify the affected feature works end-to-end.

6. **Delete the rescue branch** once validated.

### 5b. Total loss (disk failure / provider incident)

**Scenario:** the primary database is completely gone or irrecoverable.

1. **Provision a new Postgres.** On Neon: create a new project. On self-hosted: provision via Terraform / runbook.

2. **Restore from latest dump:**

   ```bash
   # Download latest
   LATEST=$(aws s3 ls s3://levelup-backups-prod/postgres/ \
     | sort | tail -1 | awk '{print $4}')
   aws s3 cp "s3://levelup-backups-prod/postgres/$LATEST" /tmp/
   gunzip "/tmp/$LATEST"

   pg_restore \
     --clean \
     --if-exists \
     --no-owner \
     --jobs=4 \
     -d "$NEW_DB_URL" \
     "/tmp/${LATEST%.gz}"
   ```

3. **Run all pending migrations:**

   ```bash
   pnpm --filter @levelup/db exec prisma migrate deploy
   ```

4. **Re-seed reference data** (learning paths, items, badges):

   ```bash
   pnpm --filter @levelup/db exec tsx prisma/seed.ts
   ```

5. **Update `DATABASE_URL`** in all secrets / environment configs to point to the new DB.

6. **Restart application services.**

7. **Run smoke tests** — critical paths: sign-in, lesson load, quiz submit, certificate verify.

8. **Declare incident resolved** once all smoke tests pass.

---

## 6. RTO / RPO targets

| Metric                             | Target    | Notes                                   |
| ---------------------------------- | --------- | --------------------------------------- |
| **RPO** (max acceptable data loss) | 5 minutes | Neon WAL checkpoint granularity         |
| **RTO** (max acceptable downtime)  | 1 hour    | Includes restore + migrate + smoke test |

If a restore is likely to exceed 1 hour, escalate to VP Engineering immediately.

---

## 7. Things that go wrong

**`pgvector` extension missing**  
The `vector` extension must be installed before restoring a dump that uses it. On a fresh Postgres:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

On Neon, enable the extension in the console (Project → Extensions) before running the restore.

---

**Ownership errors**  
`pg_restore` may emit `ERROR: must be owner of table ...`. This is usually harmless when using `--no-owner`. If objects fail to restore, check that the target user has `SUPERUSER` or the relevant object privileges, or add `--no-acl` to skip ACL statements.

---

**Large blob / bytea columns timing out**  
Certificate PDF blobs or user-uploaded assets can cause `pg_restore` to stall. Restore in parallel (`--jobs=4`) and set a generous statement timeout:

```bash
PGOPTIONS='-c statement_timeout=0' pg_restore --jobs=4 ...
```

---

**Row-count mismatch > 1%**  
If the drill row count is off by more than 1%, do not declare the drill a pass. Common causes:

- Backup was taken mid-migration (schema mismatch).
- A truncation job ran between backup and restore.
- Clock skew on the backup cron.

Investigate before closing the drill.

---

**Stale `DATABASE_URL` in secrets**  
After a total-loss restore to a new DB, every service that holds `DATABASE_URL` must be updated: API, worker, admin scripts, CI. Keep a list of secret stores in the [infra runbook](../infra/secrets.md) (placeholder).

---

## 8. Owner

**VP Engineering.** This document is reviewed and updated quarterly. Any changes to the backup configuration (plan tier, retention window, backup script, S3 bucket) must be reflected here within one week of the change.
