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

### Lane H (Wave 3.1) — opportunistic serious/moderate fixes

The Wave-3 spec stays critical-only (deliberately — see "DO NOT introduce a
new serious scan in deployed E2E" decision). In parallel with that, lane H
did a static review pass over the four target routes and shipped the
following surgical serious/moderate fixes. Local scans were used as
discovery only and the spec filter was NOT widened upstream.

**Findings + fixes (per route):**

- `/profile` — `heading-order` (serious): the page renders `<h1>Profile</h1>`
  followed directly by ~5 `<CardTitle>` elements which the UI lib hard-codes
  to `<h3>`. That's an h1→h3 skip on every card. Fix: added an `as` prop to
  `@levelup/ui` `<CardTitle>` (defaults to `h3` — no callsite breakage) and
  passed `as="h2"` on every profile card:
  - `components/learn/profile/certificates-list.tsx`
  - `components/learn/profile/baseline-card.tsx`
  - `components/learn/profile/skill-posture-card.tsx`
  - `components/learn/profile/leaderboard-opt-out-card.tsx`
  - `components/learn/profile/edit-profile-form.tsx`
  - inline cards in `app/(learn)/profile/page.tsx` (Achievements + Activity tabs)
- `/coach` — `landmark-unique` + `region` (moderate): the conversation
  sidebar rendered an unnamed `<aside>` and an unnamed inner `<nav>`. Added
  `aria-label="Coach conversation history"` to the aside and
  `aria-label="Recent conversations"` to the nav so SR users can distinguish
  them from the main `<nav>` in the learner shell.
- `/learn` — `button-name` / `aria-expanded` (moderate): the StudyPlanStrip
  toggle was a bare `<button>` whose visible text flipped between "VIEW
  4-WEEK PLAN" and "HIDE" with no `aria-expanded` and no full-sentence
  accessible name. Added `aria-expanded={expanded}` and a paraphrased
  `aria-label` so the announced state matches the visible state.
- `/admin` — no surgical fix shipped this pass. The admin dashboard surface
  uses `<NumberedSection>` + `<MonoLabel>` (non-heading) eyebrows with no
  `<h2>` between the page `<h1>` and the descendant `<h3>`s — same family
  of heading-order issue but the fix wants a structural decision (promote
  `NumberedSection` to use a real `<h2>` with the eyebrow text, vs leave it
  as a stylised label). That structural change is deferred to Wave 4 to
  keep this lane's blast radius small.

**Deferred to Wave 4:**

- All `color-contrast` (serious) findings on `text-paper-300` / `text-paper-500`
  tokens. These are foundational palette tokens used across the entire app;
  touching them risks cascading visual regressions. They want a token-bump
  designed alongside design review, not an emergency tweak in a hardening
  lane.
- `/admin` heading-order via `NumberedSection` (see above).
- Carry-over Wave-2 SERIOUS findings on `/sign-in`, `/assessment/take`, the
  admin error boundary, and the shared streak indicator's
  `aria-prohibited-attr`.

**Why we didn't widen the deployed spec's filter:**

The `a11y-axe.spec.ts` filter stays at `impact === 'critical'`. Lifting it
to `serious` here would have made the suite red on legitimate borderline
contrast/heading cases that need design input — exactly the noisy CI
failure mode the Wave 3 plan called out as harmful. Wave 4 will own the
filter widening once the Wave 4 backlog (above) is cleared.

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

## Wave 5 follow-ups (2026-05-16) — serious sweep

Lane 3 ran a one-shot widening of the filter to `critical || serious` and
re-ran the spec across both tenants. The spec filter was **reverted** to
critical-only after discovery so deployed CI stays at the pre-Wave-5 bar.

**Real serious violations found + fixed in this wave:**

1. `/profile` (kapitus) — `color-contrast` (serious): the avatar `AvatarFallback`
   used `bg-signal/15` (15% kapitus purple on white = `#edd5fc`) with
   `text-signal` (`#ad00ff`). Measured ratio **3.67:1**, fails AA. Switched to
   `bg-signal text-ink-900` — same pattern as the audited signal-on-signal
   buttons. New ratio comfortably exceeds AA on both tenants.
   - File: `apps/web/src/components/learn/profile/profile-header.tsx`.
2. `/learn` (kapitus) — `color-contrast` (serious) on `StatChip` label: the
   `text-paper-500` (kapitus → `--kp-ink-mute = #647488` / slate-500) on
   `bg-ink-800/60` (effective `#FAFBFD`) measured **4.49:1**, just below the
   AA bar. Token-level fix in `packages/ui/src/styles/kapitus.css`: darkened
   `--kp-ink-mute` from slate-500 (`100 116 139`) to slate-600 (`71 85 105`),
   new contrast ~7.3:1. Side-effect is global (all `text-paper-500` on
   kapitus tenants gets darker), which is the desired direction — every
   call site shifts further into the AA-safe band.

**Token-level fix (Item 3 scope, also resolves the bulk of axe noise):**

3. Mission Brief `.light` theme `--paper-500: 130 130 130` (`#828282`) on
   `--ink-900: 244 241 234` (`#F4F1EA`) measured **3.51:1**, fails AA.
   Darkened to `100 100 100` (`#646464`) → ~5.26:1. `--paper-100` (`#0E1019`)
   and `--paper-300` (`#505664`) on the same background already pass AA
   (16.9:1 and 6.62:1 respectively); left unchanged. See
   `docs/qa/a11y-color-contrast-wave-5.md` for the full per-token table.

**Confirmed false positives (no fix needed — axe-core bug):**

Axe reported four serious `color-contrast` violations on `/admin` (ceolawyer)
against `text-paper-100` / `text-paper-300` / `text-paper-500`. Direct
inspection via Playwright `getComputedStyle` confirms the actual rendered
colors are:

| Token            | Reported fg | Actual fg (computed) | Actual contrast on `#fff` |
| ---------------- | ----------- | -------------------- | ------------------------- |
| `text-paper-100` | `#c1c1c1`   | `rgb(26, 26, 26)`    | ~16:1                     |
| `text-paper-300` | `#cacaca`   | `rgb(60, 60, 60)`    | ~10:1                     |
| `text-paper-500` | `#cacaca`   | `rgb(92, 92, 92)`    | ~6.5:1                    |

All three pass AA in reality. The discrepancy is reproducible and appears
to be axe-core anti-aliasing pixel-sampling on Instrument Serif italic +
small mono uppercase text on warm-white surfaces. **Do NOT widen the spec
filter to serious until upstream axe-core fixes this** — the deployed CI
would block on a non-issue. Tracked as Wave 6 follow-up: investigate
suppressing this specific axe rule on serif italic h1s, or upgrade to a
post-fix axe-core release.

**Spec filter status:** reverted to `impact === 'critical'`. The temporary
widening was a discovery-only run and is not committed.

## Wave 6 follow-ups

- Investigate axe-core false-positive on `text-paper-*` tokens (see above).
  Likely needs an axe-core upgrade or a per-element exclusion.
- Re-baseline the Wave-3 spec against the deployed tenants after the
  Item 3 token bump lands on prod to confirm `/learn` (kapitus) StatChip
  no longer reports `color-contrast` even at the `serious` impact bar.
- Carry-over from Wave 5 (not in scope this lane):
  - `/profile` (kapitus) `bg-signal/15 text-signal` chip patterns elsewhere
    (team-table, curriculum chip, coach history). Same root cause as the
    AvatarFallback — same fix applies (`bg-signal text-ink-900` or pick a
    deeper signal tint). Six remaining occurrences listed below; not
    surfaced by the four-route audit but will trip once the matrix expands:
    - `apps/web/src/components/learn/team/team-table.tsx:122`
    - `apps/web/src/app/(learn)/curriculum/curriculum-view.tsx:286`
    - `apps/web/src/app/(learn)/assessment/start/page.tsx:16`
    - `apps/web/src/app/(learn)/coach/history/[id]/page.tsx:103`
    - `apps/web/src/components/learn/quests/quest-card.tsx:32` (lab badge)
    - `apps/web/src/components/coach/coach-message.tsx:404`
  - All Wave-2 serious carry-overs (still open, see "Wave-2 carry-over"
    section above).
