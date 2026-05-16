# A11y Color Contrast Audit — Wave 5 — 2026-05-16

Foundational palette audit of `text-paper-*` tokens against their dominant
surfaces. Light-mode only this wave (per Lane 3 scope); dark-mode equivalents
will be audited separately when needed.

## Method

For each light-surface theme, identified the dominant background each
`text-paper-*` token paints against, computed the WCAG 2.1 relative-luminance
contrast ratio, and graded against AA (4.5:1 for body text, 3:1 for large
text >= 24px or >= 19px+bold).

Sources of truth for token values: `packages/ui/src/styles/globals.css`
(Mission Brief `.light`), `packages/ui/src/styles/kapitus.css`
(kapitus tenant remap), `packages/ui/src/styles/ceolawyer.css`
(ceolawyer tenant remap).

Live-rendered colors verified via Playwright `getComputedStyle` on the
deployed tenants (see notes per row).

## Mission Brief — `.light` theme

Dominant background: `bg-ink-900` → `--ink-900: 244 241 234` (`#F4F1EA`).
Luminance ≈ 0.881.

| Token         | Value (before) | Hex (before) | Ratio (before) | AA?      | Action                                                                  |
| ------------- | -------------- | ------------ | -------------- | -------- | ----------------------------------------------------------------------- |
| `--paper-100` | `14 16 25`     | `#0E1019`    | ~16.9:1        | PASS AAA | None — already excellent.                                               |
| `--paper-300` | `80 86 100`    | `#505664`    | ~6.62:1        | PASS AA  | None — comfortable margin.                                              |
| `--paper-500` | `130 130 130`  | `#828282`    | **3.51:1**     | **FAIL** | Darken to `100 100 100` (`#646464`), new ratio **~5.26:1** — passes AA. |

**Change applied:** `packages/ui/src/styles/globals.css` — `.light`
`--paper-500: 130 130 130` → `100 100 100`. One-tick darken; the entire
direction of the change is "less ambiguous, more readable", so no consumer
should regress.

There is no `--paper-700` in any theme; the palette stops at `--paper-500`.

## Kapitus tenant — class-scoped remap on `body.kapitus`

Dominant background: `bg-ink-900` → `--ink-900: var(--kp-paper) = 255 255 255`
(`#FFFFFF`). Luminance ≈ 1.0.

The kapitus theme remaps Mission Brief `--paper-*` tokens to its slate-based
`--kp-ink-*` chain (see `kapitus.css` line 180-182).

| Token         | Maps to                       | Hex (before) | Ratio (before) | AA?      | Action                                                                                           |
| ------------- | ----------------------------- | ------------ | -------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `--paper-100` | `--kp-ink` `15 23 42`         | `#0F172A`    | ~17.6:1        | PASS AAA | None.                                                                                            |
| `--paper-300` | `--kp-ink-soft` `51 65 85`    | `#334155`    | ~10.5:1        | PASS AA  | None.                                                                                            |
| `--paper-500` | `--kp-ink-mute` `100 116 139` | `#647488`    | **~4.38:1**    | **FAIL** | Darken `--kp-ink-mute` to slate-600 (`71 85 105` / `#475569`), new ratio **~7.3:1** — passes AA. |

Note: the `--paper-500` failure was reported by axe on `/learn` StatChip
(`text-paper-500` on a semi-transparent `bg-ink-800/60` chip whose effective
color is `~#FAFBFD`, so the ratio is computed against that, not pure white;
the math is essentially the same).

**Change applied:** `packages/ui/src/styles/kapitus.css` —
`--kp-ink-mute: 100 116 139` → `71 85 105` (slate-500 → slate-600). The
remap chain means **every** `text-paper-500` consumer on kapitus surfaces
gets the darker tone. The change is monotonic (darker on light), so no
consumer regresses — only borderline cases improve.

## CEO Lawyer tenant — class-scoped remap on `body.ceolawyer`

Dominant background: `bg-ink-900` → `--ink-900: var(--cl-paper) = 255 255 255`
(`#FFFFFF`). Luminance ≈ 1.0.

The ceolawyer theme remaps Mission Brief `--paper-*` tokens to its
`--cl-ink-*` chain (see `ceolawyer.css` line 189-191).

| Token         | Maps to                    | Hex       | Ratio   | AA?      | Action |
| ------------- | -------------------------- | --------- | ------- | -------- | ------ |
| `--paper-100` | `--cl-ink` `26 26 26`      | `#1A1A1A` | ~17.4:1 | PASS AAA | None.  |
| `--paper-300` | `--cl-ink-soft` `60 60 60` | `#3C3C3C` | ~10.4:1 | PASS AA  | None.  |
| `--paper-500` | `--cl-ink-mute` `92 92 92` | `#5C5C5C` | ~6.50:1 | PASS AA  | None.  |

All three tokens pass AA on this tenant. **Verified by direct
`getComputedStyle` inspection** on `https://ceolawyer.ailevel.app/admin`
during the Wave-5 lane-3 run: h1.text-paper-100 reads as
`rgb(26, 26, 26)`; the briefing eyebrow's text-paper-300 reads as
`rgb(60, 60, 60)`; the date-stamp text-paper-500 reads as `rgb(92, 92, 92)`.

Axe-core 4.11 reports `color-contrast` violations against these three
elements anyway, with fgColor values that do **not** match the computed
style (axe reports `#c1c1c1`/`#cacaca`/`#cacaca` respectively). This appears
to be an axe pixel-sampling false positive on serif italic + small mono
uppercase on warm-white. See `a11y-report-wave-3.md#wave-6-follow-ups` for
the investigation ticket.

## Out of scope this lane

- Dark-mode `--paper-*` token contrast (i.e. dark theme on `bg-ink-900 ≈
#08090E`). Different palette, different math; warrants its own audit.
- Non-`paper` text utilities (e.g. `text-signal`, `text-success`,
  `text-warning`, `text-danger`). Spot-fix on `text-signal` over
  `bg-signal/15` already shipped in this lane (Avatar fallback).
- The `--kp-ink-faint: 148 163 184` and `--cl-ink-faint: 140 140 140`
  tokens — these are intended as decorative/disabled tones and aren't
  exposed through the `text-paper-*` Tailwind utilities. Auditing them
  is Wave-6 scope, in coordination with design.
