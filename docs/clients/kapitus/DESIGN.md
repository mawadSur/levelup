# Kapitus — Design System (client variant)

> A separate design language for the Kapitus engagement. This is **not** the Mission Brief default — it's a deliberate FinTech-corporate pivot. Lives only on `client/kapitus` branch.

## Reference

- **Reference site:** https://kapitus.com
- **Buyer profile:** Director of Finance / CFO / Operations lead at a small-to-mid-market business shopping financing options
- **Emotional posture:** trust · stability · speed · "we already vetted the dozen options for you"
- **Anti-pattern:** anything that looks like an AI-academy aesthetic — no serif italic display, no aerospace amber, no editorial gravity. The buyer needs to feel like they're on a confident, modern fintech site (vibrant purple over dark hero, white content sections).

## Aesthetic statement

**Modern FinTech with confident accents.** Functional and assured. Dark hero band that anchors the brand purple, then long ribbons of white content with periwinkle secondary accents and one cream highlight band. Grid-disciplined, generous whitespace, high-contrast typography, modular cards. Big, vibrant CTAs in title case ("Apply Now", "Get Offers"). Headlines in sentence case with terminal periods.

## What changes vs Mission Brief

| Dimension | Mission Brief (default) | Kapitus (this branch) |
|---|---|---|
| Theme baseline | Dark (`#08090E`) | Mostly light (`#FFFFFF` / `#F8FAFC`) with a dark `#282828` hero + final-CTA band |
| Display font | Instrument Serif (italic) | Manrope (sans, all weights) |
| Body font | Geist Sans | Manrope |
| Mono font | Geist Mono (heavy use as eyebrows) | Used sparingly — only for technical IDs |
| Primary accent | Sodium amber `#FFB300` | Vibrant purple `#AD00FF` (primary CTAs, brand highlights) |
| Secondary accent | — | Periwinkle blue `#7694FF` (secondary CTAs, sidebar form actions) |
| Highlight band | — | Cream-yellow `#FCFFDF` (one band, e.g. "KapitusPLUS Difference") |
| Layout | Editorial / asymmetric | Strict 12-col grid, modular cards |
| Decoration | Blueprint grid, grain overlay, numbered Roman sections | None — whitespace and rules are the decoration |
| Headline rhythm | Italic emphasis ("safely") | Bold, sentence case, with terminal periods ("Financing solutions to fuel your business.") |
| CTA style | Sharp, mono-uppercase ("REQUEST DEMO →") | Title Case ("Apply Now", "Get Offers", "Explore Financing Options") |
| Section markers | Roman numerals (`I.`, `II.`) | Plain heading-eyebrows ("HOW IT WORKS"), small caps |
| Density | High | Low–medium (lots of whitespace) |

## Tokens

### Colors

```css
.kapitus {
  /* Foundation */
  --kp-paper: 255 255 255;          /* #FFFFFF — primary background */
  --kp-mist: 248 250 252;           /* #F8FAFC — section background */
  --kp-fog: 241 245 249;            /* #F1F5F9 — subtle panel background */
  --kp-rule: 226 232 240;           /* #E2E8F0 — borders / dividers */
  --kp-rule-strong: 203 213 225;    /* #CBD5E1 — emphasized borders */

  /* Ink */
  --kp-ink: 15 23 42;               /* #0F172A — primary text (slate-900) */
  --kp-ink-soft: 51 65 85;          /* #334155 — secondary text */
  --kp-ink-mute: 100 116 139;       /* #64748B — muted (placeholder, captions) */
  --kp-ink-faint: 148 163 184;      /* #94A3B8 — disabled */

  /* Brand — matches live kapitus.com palette */
  --kp-purple: 173 0 255;           /* #AD00FF — primary brand accent (CTAs, highlights) */
  --kp-purple-deep: 145 0 224;      /* #9100E0 — hover on primary */
  --kp-blue-soft: 118 148 255;      /* #7694FF — periwinkle secondary CTA */
  --kp-dark-band: 40 40 40;         /* #282828 — hero + final-CTA dark band */
  --kp-cream: 252 255 223;          /* #FCFFDF — accent highlight band */

  /* Semantic */
  --kp-success: 22 163 74;          /* #16A34A — green-600 */
  --kp-warning: 217 119 6;          /* #D97706 — amber-600 */
  --kp-danger: 220 38 38;           /* #DC2626 — red-600 */
  --kp-info: 14 165 233;            /* #0EA5E9 — sky-500 */
}
```

No dark theme on this client. Light page chrome with two dedicated dark bands (hero + final CTA).

### Typography

- **Display + Body:** `Manrope` (Google Fonts, free, weights 200–800). Never italic for headlines. Loaded via `next/font/google` as `--font-manrope`; the Tailwind preset wires it into `fontFamily.sans`.
- **Mono:** keep `Geist Mono` from Mission Brief — used only for application IDs, account numbers, financial figures with `font-variant-numeric: tabular-nums`.

**Hierarchy:**

| Utility | Size | Weight | Use |
|---|---|---|---|
| `kp-display` | clamp(2.75rem, 5vw, 4rem) | 700 | hero headline only |
| `kp-h1` | 2.25rem | 700 | page titles |
| `kp-h2` | 1.75rem | 600 | section headers |
| `kp-h3` | 1.25rem | 600 | card titles |
| `kp-eyebrow` | 0.75rem, uppercase, tracking +0.1em | 600 | section eyebrows ("HOW IT WORKS") — small caps style, purple color, no monospace |
| `kp-body` | 1rem | 400 | body |
| `kp-body-lg` | 1.125rem | 400 | hero subhead, intro paragraphs |
| `kp-body-sm` | 0.875rem | 400 | captions, helper text |
| `kp-data` | 1rem mono | 500 | account/application IDs, dates, dollars |

Line heights: 1.1 for display, 1.25 for h1/h2, 1.4 for h3, 1.6 for body, 1.5 for body-sm.

### Spacing + radius

- 4px base, generous outer padding (`px-6 sm:px-8 lg:px-12`), section-level vertical rhythm via `py-16 lg:py-24`.
- Container max-width: `1240px`.
- Reading max-width: `680px`.
- Border radius: `--kp-radius-sm: 6px` (inputs/buttons), `--kp-radius-md: 10px` (cards), `--kp-radius-lg: 16px` (large modules), `--kp-radius-pill: 9999px` (chips, status pills).
- Card shadow: subtle, only on hover. `--kp-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)`. Never glow.

### Layout primitives

- **Grid:** strict 12-col with 24px gutters on desktop.
- **Modular cards:** `bg-kp-paper border border-kp-rule rounded-kp-md p-6 lg:p-8`. Hover: `border-kp-rule-strong shadow-kp-sm transform translate-y-[-1px]`.
- **Section background rhythm:** white → mist → white → mist between content sections, with one `bg-kp-cream` band as a deliberate accent and dedicated dark bands (`bg-kp-dark-band`) for hero and final CTA.
- **Number-step illustrations** for processes (e.g. KapitusPLUS three-step) — circle with number, then label below.

### Motion

- Minimal. Only on hover (border-color, shadow, translateY-1) and focus (ring).
- No scroll-triggered animation. No mission-in stagger from Mission Brief.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo) for hover transitions, 180-220ms.

### CTAs

- **Primary CTA:** `bg-kp-purple text-white px-6 py-3 rounded-kp-sm font-semibold hover:bg-kp-purple-deep`. Title Case ("Apply Now", "Get Started", "Schedule A 30-Min Audit"). NOT all-caps, NOT sentence case.
- **Secondary CTA:** `border border-kp-blue-soft text-kp-blue-soft px-6 py-3 rounded-kp-sm font-medium hover:bg-kp-blue-soft hover:text-white` — periwinkle outline that fills on hover. Used for sidebar form actions and "secondary" calls.
- **Tertiary / link:** plain text, `text-kp-purple underline-offset-2 hover:underline`.
- **On the dark hero band:** primary button stays purple; secondary becomes `border-white/30 text-white hover:bg-white/10`.

### Headlines + copy

- **H1 / display:** sentence case with a terminal period. Mirrors live kapitus.com: "Financing solutions to fuel your business." → our equivalent: "AI training that protects your loan applicants' data."
- **CTA labels:** Title Case. ("Apply Now", "Get Offers", "Talk To A Specialist".)
- **Eyebrows:** UPPERCASE, purple, +0.1em tracking.

## What this means for our existing surfaces

We are **not** redesigning the entire app for Kapitus. The branch is for a Kapitus-specific marketing surface — a dedicated landing page and scoped sign-up/sign-in, while the app underneath stays Mission Brief.

Initial scope (shipped):

1. **`/clients/kapitus`** — marketing landing page (hero on dark band, problem stats, how-it-works, roles, governance mock, pricing with cream accent inner panel, FAQ, final CTA on dark band).
2. **`<KapitusLayout>`** — scoped layout that swaps tokens and the Manrope font at the route level via the `.kapitus` class wrapper.
3. **`<KapitusNav>`** + **`<KapitusFooter>`** — Kapitus-style chrome.
4. **`/clients/kapitus/sign-up`** — co-branded form, industry pre-set to Financial services.

Phase 2 (when client buys in deeper):
- `/clients/kapitus/sign-in` co-branded.
- Kapitus-themed certificate template (the cert PDF generator can branch on `org.industry === 'FINANCIAL_SERVICES_KAPITUS'`).

## What stays unchanged

- All Mission Brief design tokens and primitives in `packages/ui` — untouched.
- Existing routes (`/`, `/pricing`, `/governance`, `/admin`, `/learn`, etc.) — untouched.
- Auth, billing, governance, content — untouched.

## Implementation reference

Token + preset files:
1. `packages/ui/src/styles/kapitus.css` — class-scoped CSS custom properties under `.kapitus`.
2. `packages/ui/kapitus-tailwind-preset.ts` — exports `kp-*` color/spacing utilities and Manrope `fontFamily.sans`.
3. `apps/web/src/components/kapitus/{nav,footer,hero,problem-stats,how-it-works,roles,governance-mock,pricing,faq,final-cta,sign-up-form}.tsx` — landing components.
4. `apps/web/src/app/clients/kapitus/{layout,page,sign-up/page}.tsx` — routes.

## Approval checkpoint before we ship

- Side-by-side compare: kapitus.com vs `/clients/kapitus` — hero, CTAs, card grid, color palette, typography hierarchy.
- Run the sales narrative against a friendly Kapitus-equivalent buyer ("would you click 'Apply Now' from this page?").
- A11y pass: WCAG AA contrast on every text/background pair (financial-services compliance). Special attention: `kp-blue-soft` (`#7694FF`) on white passes AA at 18px+ but not at 14px body — use it as button surface (white text on `kp-blue-soft`) rather than as text on white for body copy.
