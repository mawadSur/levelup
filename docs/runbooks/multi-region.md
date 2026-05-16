# Multi-Region Playbook

Status: **planning doc** — nothing in production is multi-region yet. This file
captures the current posture, the failure modes it implies, and the checklist
to follow when we decide to actually go multi-region.

Last reviewed: 2026-05-15 (CR.28).

---

## 1. Current posture (single region)

| Layer          | Provider             | Region                                                              |
| -------------- | -------------------- | ------------------------------------------------------------------- |
| Web (Next.js)  | Vercel               | `iad1` (Washington, DC)                                             |
| API + worker   | Render               | `oregon` (us-west-2)                                                |
| Postgres       | Supabase (or Neon)   | Single region, paired with API region (Oregon-adjacent recommended) |
| Redis          | Upstash              | `us-west-2` (Oregon)                                                |
| Object storage | Cloudflare R2        | Global edge (R2 is intrinsically multi-region — no work here)       |
| DNS            | Cloudflare or Vercel | Global                                                              |
| Email          | Resend               | Global                                                              |

The API region is intentionally co-located with the database to keep query
latency low — every other piece (web, Redis, R2) follows the API region.

## 2. Failure modes this implies

| Scenario                         | Blast radius                                                   | Customer impact                                                           |
| -------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Render `oregon` regional outage  | API + worker both unreachable                                  | Full app down for everyone — only static marketing pages survive          |
| Supabase / Neon DB regional fail | API up but every request 5xx after first DB query              | Full app down                                                             |
| Upstash `us-west-2` outage       | Queue stalls; coach calls 5xx because rate-limiter is in Redis | Background jobs (cert PDF, manager digest) backed up; live coach degraded |
| Vercel `iad1` outage             | Web frozen at last edge cache                                  | Logged-in app routes 5xx; marketing slowly degrades                       |
| Cloudflare R2 outage             | Cert downloads 5xx                                             | Existing users can still learn; new cert downloads fail                   |

Single-region posture is acceptable for the current pilot scale but becomes
table stakes to address before we sign multi-region enterprise customers
(EU/APAC SLAs typically require a documented DR plan).

## 3. RTO / RPO targets

Proposed (confirm with the user before adopting):

| Metric | Target                                                     | How we achieve it                                                |
| ------ | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| RTO    | 1 hour for full app, 15 min for read-only fallback         | DNS failover to a warm standby region + read replica promotion   |
| RPO    | 5 minutes (we lose at most 5 min of writes on DB failover) | Streaming replication via Neon read replicas / Supabase WAL ship |

**TBD by the user.** These are sensible defaults for a B2B SaaS at our stage
but the user should confirm before we wire any of the below.

## 4. The "go multi-region" checklist

Do this when we decide to spend the operating cost. Each step is independent
and can ship over multiple weeks.

### 4.1 Database — Neon read replicas (preferred)

1. Migrate from Supabase Postgres to Neon (or stay on Supabase if they ship
   cross-region replicas). Neon's read-replica creation is point-and-click.
2. Provision a read replica in `eu-west-1` (or wherever the second region
   lives). Replica has its own connection string.
3. Add `DATABASE_REPLICA_URL` env var; route read-only queries to it. Reads
   that must be strongly consistent (post-mutation reads, auth lookups)
   stay on the primary connection string.
4. Document promotion: a Neon API call promotes the replica to primary in
   `< 5 min`. Capture exact CLI in this runbook when implemented.

### 4.2 API — CDN-fronted, multi-region

1. Add a second Render service in a non-Oregon region (e.g., Frankfurt for
   EU coverage). Both services share the same `DATABASE_URL` initially.
2. Put Cloudflare in front of the API origin. Use Cloudflare Load Balancing
   to route to the closest healthy origin with active health checks against
   `/api/health`.
3. Cache-control: only GETs that are explicitly idempotent and free of
   personalisation should be cached at the edge. The API currently sends
   `Cache-Control: no-store` on everything — change that on a per-endpoint
   basis as part of this work.

### 4.3 DNS failover

1. In Cloudflare DNS, set both API origins as A/AAAA records behind the
   load-balancer pool. Health-check the `/api/health` endpoint at 10s
   intervals.
2. Failover policy: prefer Oregon as long as it's healthy; failover to the
   second region after 3 consecutive failed health checks (~30 s).
3. Test the failover path quarterly by manually disabling the Oregon origin
   and confirming traffic drains.

### 4.4 Object storage

R2 is multi-region by design (Cloudflare picks the closest data centre at
read time). No work needed beyond what CR.26 already does — keep cert PDFs
on R2.

### 4.5 Background jobs

1. Workers should run in the primary region only (they consume the queue
   and mutate the primary DB). A second region's workers must NOT activate
   automatically — they would race with the primary.
2. Document the manual "swing workers" step: on primary failover, scale
   the secondary region's worker from 0 to N instances, then scale the
   primary down.

### 4.6 Runbook for promoting a replica

Write the actual `curl`/`pnpm` commands here once we choose Neon vs. Supabase.
At minimum:

1. Confirm primary is unreachable for `> 5 min` (don't promote on a hiccup).
2. Promote the replica via the provider API. Capture the new connection string.
3. Update `DATABASE_URL` env var on both Render services + the worker; redeploy.
4. Update the Cloudflare load-balancer pool to prefer the new primary region.
5. Notify customers via status page if RPO > 0 (some writes will be lost).
6. After the primary recovers, treat it as the new standby — do NOT auto-fail
   back. Schedule a planned cutover during a maintenance window.

## 5. Where this lives

- `render.yaml` documents the current single-region posture inline (see the
  `region: oregon` comment block).
- This file is the source of truth for the multi-region plan.
- When we provision a second region, update both files plus
  `SETUP.md` ("Production environment matrix" section) in lock-step.
