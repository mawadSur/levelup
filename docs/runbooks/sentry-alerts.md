# Sentry alert rules

Alert rules can't be defined in source (no first-party Sentry "config-as-code"
without a paid integration tier). Provision the four alerts below in the Sentry
UI for **every** production project: `levelup-web`, `levelup-api`,
`levelup-worker`.

Pre-flight:

1. Sentry → Settings → Integrations → install **Slack** (workspace: `levelup`)
   and **PagerDuty** (service: `levelup-oncall`).
2. Sentry → Settings → Teams → confirm an `engineering` team exists and the
   three production projects are assigned to it.

---

## 1. New issue in production — page on-call

**Why:** any unseen exception in prod should wake someone up.

- Project: per-project (web / api / worker)
- Type: **Issue Alert**
- When: `A new issue is created`
- Filters:
  - `event.environment` equals `production`
- Actions:
  - Send a **PagerDuty** notification to service `levelup-oncall` (severity:
    `error`)
  - Also send a Slack message to `#incidents` with default issue context

Frequency: every event (no throttle — pager handles dedup).

## 2. Issue spike — > 50 events / 5 min

**Why:** catch a deploy that just lit up an existing bug across many users.

- Project: per-project
- Type: **Issue Alert**
- When: `The issue is seen more than 50 times in 5 minutes`
- Filters:
  - `event.environment` equals `production`
- Actions:
  - Send a Slack message to `#incidents` (do **not** page — pager fires from
    rule #1 if the spike is on a new issue)

Frequency: 1 hour throttle per issue (Sentry's default).

## 3. Performance regression — P95 > 2× 7-day baseline

**Why:** detect latency regressions on the auth + coach hot paths before a
human notices.

Provision **two** metric alerts (one per route family):

### 3a. `/api/coach/*`

- Project: `levelup-api`
- Type: **Metric Alert** → Transaction Duration
- Aggregation: `p95(transaction.duration)`
- Filter: `transaction:/api/coach/* AND event.environment:production`
- Time window: 5 minutes
- Trigger: **Critical** when above `200%` of the 7-day baseline (use Sentry's
  built-in "Dynamic" alert with a 7-day comparison window — if Dynamic alerts
  aren't on the plan, set the static threshold to 2× the current P95 observed
  in the Performance tab and revisit quarterly)
- Actions: Slack `#engineering`

### 3b. `/api/auth/*`

- Same setup as 3a, but with `transaction:/api/auth/*` filter and project
  `levelup-api`.

Resolve threshold: drop back below `150%` of baseline for 10 minutes.

## 4. Quota — monthly events ≥ 80% of plan limit

**Why:** avoid silent event drops the day before invoicing.

- Project scope: **organization-wide** (Sentry → Settings → Subscription →
  Usage Alerts)
- Type: **Usage Alert**
- Trigger: `Errors quota at 80% of monthly limit`
- Actions:
  - Email `finance@levelup.example`
  - Slack `#engineering` (FYI — not paging)

Also add a 95% rule on the same screen routed to `#incidents` as a hard
cutover warning.

---

## Verification

After provisioning, trigger each rule manually in staging by:

1. `throw new Error("test-on-call")` in a debug API route, hit it once → rule
   #1 should page.
2. Hit the same route 60× in a loop → rule #2 should fire to Slack.
3. Add an artificial `await sleep(5000)` to `/api/coach/healthcheck` for a
   minute → rule #3a should trip.
4. Quota alert can be tested only by Sentry support; verify the rule exists
   and the email recipient is correct via "Send Test Notification".

## Ownership

Owner: engineering.
Review cadence: every quarter at the on-call rotation handoff. Update
baselines in rule #3 if the app's P95 has shifted materially.
