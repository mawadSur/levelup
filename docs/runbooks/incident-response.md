# Incident Response Runbook

**Owner:** VP Engineering  
**Applies to:** All production services — web, API, worker, database, auth  
**Last reviewed:** 2026-Q2

---

## 1. Severity levels

| Severity  | Definition                                                         | Response time (acknowledge)          | Example                                                                            |
| --------- | ------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------- |
| **SEV-1** | Complete outage or data loss affecting all users                   | 15 minutes, 24/7                     | Site down, database unresponsive, auth broken for all users                        |
| **SEV-2** | Major feature broken for a significant user segment; no workaround | 30 minutes, business hours + on-call | Quiz submission failing, certificate generation stuck, payment flow broken         |
| **SEV-3** | Degraded experience; workaround exists                             | 4 hours, business hours              | Slow page loads, email delivery delayed, a single non-critical feature unavailable |
| **SEV-4** | Cosmetic or minor issue; no user impact                            | Next business day                    | Typo in UI, a log line with wrong severity, minor metric anomaly                   |

**On-call coverage:** SEV-1 and SEV-2 require 24/7 on-call acknowledgement. Refer to the PagerDuty schedule (*https://levelup.pagerduty.com — placeholder*).

---

## 2. Communication plan

### Status page

All incidents SEV-2 and above get a status page entry within **15 minutes** of acknowledgement.

- URL: *https://status.levelup.example* (placeholder — set up Statuspage.io or similar)
- Update cadence: every 30 minutes during an active incident.
- Incident states: `Investigating → Identified → Monitoring → Resolved`.

### Customer email template

Send to affected customers for SEV-1 and any SEV-2 that exceeds 30 minutes of impact.

```
Subject: Service disruption — [brief description] — [date]

Hi [Name / "LevelUp users"],

We experienced an issue affecting [feature/service] between [start time UTC] and
[end time UTC / "which is now resolved"].

What happened: [1–2 plain-English sentences — no jargon.]

Who was affected: [all users / users in X org / users on the Y path]

What we did: [brief resolution summary]

What we're doing to prevent recurrence: [1–2 sentences or "see post-mortem at [link]"]

We apologise for the disruption.

— LevelUp AI Academy Engineering
```

### Internal Slack channels

| Channel                  | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| `#incidents`             | Active incident bridge — all updates go here       |
| `#incidents-postmortems` | Post-mortem drafts and follow-up tracking          |
| `#on-call`               | PagerDuty/Opsgenie alerts and ack confirmations    |
| `#engineering`           | Resolved incident summary for wider team awareness |

Tag the incident commander (IC) with `@[name]` at the top of every `#incidents` thread.

---

## 3. The first 15 minutes

When an alert fires or a user report lands:

- [ ] **Acknowledge** the alert (PagerDuty / Slack). Prevents escalation.
- [ ] **Assign an IC.** The first person who acknowledges owns the incident until they hand off. One IC at a time.
- [ ] **Open a Slack thread** in `#incidents`. Title: `[SEV-N] Brief description — YYYY-MM-DD HH:MMz`.
- [ ] **Assess scope.** Is it SEV-1, SEV-2, or lower? Use the table in §1.
- [ ] **Post a status page entry** for SEV-1 or SEV-2: "We are investigating reports of [X]. Updates every 30 minutes."
- [ ] **Check the obvious first:**
  - Recent deploys? (`git log --oneline -10`, Vercel/Railway deploy log)
  - Recent DB migrations?
  - External dependency? (check Neon status, Vercel status, Resend status, Stripe status)
  - Memory / CPU / disk spike? (check Grafana / Railway metrics)
- [ ] **Bring in help** if you haven't found the cause within 10 minutes. Don't solo an SEV-1.
- [ ] **Preserve evidence.** Screenshot dashboards, copy relevant log spans, note exact error messages — before you start poking things.
- [ ] **Communicate > fix.** Keep the status page and `#incidents` thread updated. Stakeholders tolerate outages when they're informed.

---

## 4. Post-mortem template

File a post-mortem for every SEV-1 and SEV-2. SEV-3 post-mortems are optional but encouraged if the same issue recurs.

Write it within **48 hours** of resolution. The goal is learning, not blame.

```markdown
# Post-mortem: [Brief title]

**Severity:** SEV-N
**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**IC:** [name]
**Authors:** [names]
**Status:** Draft / In review / Final

---

## Summary

[2–4 sentences. What broke, what the user impact was, how it was resolved.]

## Timeline (UTC)

| Time  | Event                            |
| ----- | -------------------------------- |
| HH:MM | Incident started / first alert   |
| HH:MM | IC assigned, investigation began |
| HH:MM | Root cause identified            |
| HH:MM | Fix deployed                     |
| HH:MM | Incident resolved                |

## Root cause

[Concise technical explanation. Include contributing factors.]

## What went well

- [Thing that helped us respond faster]
- [Tool / process / person that made a difference]

## What went wrong

- [Gap in monitoring that delayed detection]
- [Process that slowed the response]

## Action items

| Action                | Owner  | Due        | Ticket |
| --------------------- | ------ | ---------- | ------ |
| [Add alert for X]     | [name] | YYYY-MM-DD | [#123] |
| [Write runbook for Y] | [name] | YYYY-MM-DD | [#124] |

---

_Post-mortem doc template — store completed post-mortems at:_
*https://notion.so/levelup/post-mortems — placeholder*
```

---

_Questions about this runbook? Ping `#engineering` or the VP Engineering._
