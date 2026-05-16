# A11y Audit — Wave 3 — 2026-05-15

Follow-up to the 2026-05-12 sweep (see `docs/qa/a11y-report-2026-05-12.md`).
This wave runs `@axe-core/playwright` against four surfaces that have changed
since the previous audit, captured as an automated spec that ships with the
deployed-only suite so we can re-run it on every prod deploy.

## Setup

- **Tooling**: `@axe-core/playwright` (added as a `@levelup/e2e` devDependency)
  - the existing `playwright.deployed.config.ts` project matrix (kapitus +
    ceolawyer).
- **Spec**: `e2e/specs-deployed/a11y-axe.spec.ts` — one test per route, signs
  in via the deployed-auth helper, navigates, runs axe with the WCAG 2.0/2.1
  A + AA tag set, then filters to `impact === 'critical'`. A non-empty
  critical list fails the test, with a pretty-printed summary of each rule
  - node count in the failure message.
- **Run command**:
  ```sh
  pnpm --filter @levelup/e2e exec playwright test \
    --config=playwright.deployed.config.ts a11y-axe.spec.ts
  ```

## Scope

Routes scanned (each scanned twice — once per project / tenant):

| Route      | Signed in as      | Why it changed since Wave 2                                                                                             |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/admin`   | `admin@demo.test` | New activity-feed surface, refreshed StatCards layout, new "Activity Stream" NumberedSection.                           |
| `/learn`   | `ed@demo.test`    | New StudyPlanStrip, new CoachNudgeStrip, new HeroNextStep onboarding card, stat-chip refresh.                           |
| `/profile` | `admin@demo.test` | New tabs / sections shipped with the streak + gamification work after 2026-05-12.                                       |
| `/coach`   | `ed@demo.test`    | Voice mode controls (CR.39) added a new region — re-audit the chat shell with the new `<VoiceControls>` component live. |

Severity filter: **critical only**. Serious / moderate / minor are explicitly
out of scope for Wave 3 (tracked for Wave 4). The deployed spec passes when
zero critical violations remain on each route.

## Results

The Wave-3 scan ships as a regression spec rather than a one-shot audit:
`a11y-axe.spec.ts` is the source of truth. The expected steady state is **0
critical violations on each route**; the spec turns red the moment that
changes.

At the time this report was authored the spec had not been executed against
the deployed tenants from this session (no install / test execution from the
quality-eng lane — see "Caveats" in the handoff report). Once CI picks the
spec up the first run will produce a baseline; any rows with criticals will
be added here as a per-route fix log.

### Per-route status (to be filled by the first CI run)

| Route      | Criticals (kapitus) | Criticals (ceolawyer) | Fixed in this wave | Deferred to Wave 4         |
| ---------- | ------------------- | --------------------- | ------------------ | -------------------------- |
| `/admin`   | _pending CI run_    | _pending CI run_      | —                  | All serious/moderate/minor |
| `/learn`   | _pending CI run_    | _pending CI run_      | —                  | All serious/moderate/minor |
| `/profile` | _pending CI run_    | _pending CI run_      | —                  | All serious/moderate/minor |
| `/coach`   | _pending CI run_    | _pending CI run_      | —                  | All serious/moderate/minor |

A route with `0` criticals stays as `0` here; routes that surface a critical
finding will get a numbered list of `[rule-id]` + `selector` + the fix
applied (or a Wave-4 ticket reference if it's not a 30-minute fix).

## Wave-2 carry-over to triage in Wave 4

These are the previously-known SERIOUS / MODERATE findings from the
2026-05-12 report. They are explicitly NOT in scope for Wave 3:

- `/learn` + `/coach` — `aria-prohibited-attr` on the shared streak indicator.
- `/sign-in` — `link-in-text-block` on the mailto support link (partially
  addressed Wave 2; verify steady state).
- `/sign-in` footer — `heading-order` skip.
- `/admin` error boundary — `landmark-one-main` + `region`.
- `/assessment/take` — `aria-progressbar-name`, `page-has-heading-one`.

These will be the Wave-4 scope when we lift the spec's filter from
`critical` to `critical + serious`.

## Next actions

1. Run the spec against `kapitus` + `ceolawyer` (one CI pass), record the
   baseline above, then file Wave-4 tickets for any deferred severities.
2. When the spec is green steady-state, gate Vercel preview deploys on it
   for the four routes above so a critical regression cannot ship without a
   visible failure.
3. Expand the route matrix to include `/sign-in`, `/assessment`, `/curriculum`,
   `/streak` for full surface coverage in Wave 5.
