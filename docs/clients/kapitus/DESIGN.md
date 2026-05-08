# Kapitus — Design System (client variant)

> A separate design language for the Kapitus engagement. This is **not** the Mission Brief default — it's a deliberate FinTech-corporate pivot. Lives only on `client/kapitus` branch.

## Reference

- **Reference site:** https://kapitus.com
- **Buyer profile:** Director of Finance / CFO / Operations lead at a small-to-mid-market business shopping financing options
- **Emotional posture:** trust · stability · speed · "we already vetted the dozen options for you"
- **Anti-pattern:** anything that looks like an AI-academy aesthetic — no serif italic display, no aerospace amber, no editorial gravity. The buyer needs to feel like they're on a *bank's* website.

## Aesthetic statement

**Corporate Modern. Professional FinTech.** Functional, not decorative. Grid-disciplined, generous whitespace, high-contrast typography, a single calming primary color (deep navy), unmistakable CTAs, and modular card layouts that turn complex financial information into something a busy operator can scan in 8 seconds.

## What changes vs Mission Brief

| Dimension | Mission Brief (default) | Kapitus (this branch) |
|---|---|---|
| Theme baseline | Dark (`#08090E`) | Light (`#FFFFFF` / `#F8FAFC`) |
| Display font | Instrument Serif (italic) | DM Sans / Inter Tight (sans, no italics) |
| Body font | Geist Sans | Inter Tight |
| Mono font | Geist Mono (heavy use as eyebrows) | Used sparingly — only for technical IDs |
| Primary accent | Sodium amber `#FFB300` | Deep navy `#0B2447` (primary), royal blue `#1E40AF` (interactive) |
| Layout | Editorial / asymmetric | Strict 12-col grid, modular cards |
| Decoration | Blueprint grid, grain overlay, numbered Roman sections | None — whitespace and rules are the decoration |
| Headline rhythm | Italic emphasis ("safely") | Bold emphasis (`font-bold`), no italics |
| CTA style | Sharp, mono-uppercase ("REQUEST DEMO →") | Sentence-case, prominent buttons ("Apply now") |
| Section markers | Roman numerals (`I.`, `II.`) | Plain heading-eyebrows ("HOW IT WORKS"), small caps |
| Density | High | Low–medium (lots of whitespace) |

## Tokens

### Colors

```css
:root {
  /* Foundation */
  --kp-paper: 255 255 255;          /* #FFFFFF — primary background */
  --kp-mist: 248 250 252;           /* #F8FAFC — section background */
  --kp-fog: 241 245 249;             /* #F1F5F9 — subtle panel background */
  --kp-rule: 226 232 240;            /* #E2E8F0 — borders / dividers */
  --kp-rule-strong: 203 213 225;     /* #CBD5E1 — emphasized borders */

  /* Ink */
  --kp-ink: 15 23 42;                /* #0F172A — primary text (slate-900) */
  --kp-ink-soft: 51 65 85;           /* #334155 — secondary text */
  --kp-ink-mute: 100 116 139;        /* #64748B — muted (placeholder, captions) */
  --kp-ink-faint: 148 163 184;       /* #94A3B8 — disabled */

  /* Brand */
  --kp-navy: 11 36 71;               /* #0B2447 — primary navy (headers, brand) */
  --kp-navy-deep: 7 22 44;           /* #07162C — hover on primary */
  --kp-blue: 30 64 175;              /* #1E40AF — interactive (links, focus rings) */
  --kp-blue-soft: 219 234 254;       /* #DBEAFE — link backgrounds, soft accents */
  --kp-cta: 14 165 233;              /* #0EA5E9 — alternate CTA accent (sky-500) — use sparingly */

  /* Semantic */
  --kp-success: 22 163 74;           /* #16A34A — green-600 */
  --kp-warning: 217 119 6;           /* #D97706 — amber-600 */
  --kp-danger: 220 38 38;            /* #DC2626 — red-600 */
  --kp-info: 14 165 233;             /* same as cta */
}
```

No dark theme on this client. Light only.

### Typography

- **Display + Body:** `Inter Tight` (Google Fonts, free, supports all weights). Never italic for headlines.
- **Body alternative for long-form:** could pair with `Source Sans 3` if Inter Tight feels too geometric. Decide during implementation.
- **Mono:** keep `Geist Mono` from Mission Brief — used only for application IDs, account numbers, financial figures with `font-variant-numeric: tabular-nums`.

**Hierarchy:**

| Utility | Size | Weight | Use |
|---|---|---|---|
| `kp-display` | clamp(2.75rem, 5vw, 4rem) | 700 | hero headline only |
| `kp-h1` | 2.25rem | 700 | page titles |
| `kp-h2` | 1.75rem | 600 | section headers |
| `kp-h3` | 1.25rem | 600 | card titles |
| `kp-eyebrow` | 0.75rem, uppercase, tracking +0.1em | 600 | section eyebrows ("HOW IT WORKS") — small caps style, navy color, no monospace |
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
- **Section background alternation:** alternate `bg-kp-paper` and `bg-kp-mist` between sections to create rhythm without decoration.
- **Number-step illustrations** for processes (e.g. KapitusPLUS three-step) — circle with number, then label below.

### Motion

- Minimal. Only on hover (border-color, shadow, translateY-1) and focus (ring).
- No scroll-triggered animation. No mission-in stagger from Mission Brief.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo) for hover transitions, 180-220ms.

### CTAs

- **Primary CTA:** `bg-kp-navy text-white px-6 py-3 rounded-kp-sm font-semibold hover:bg-kp-navy-deep`. Sentence case ("Apply now", "Get started", "Talk to a specialist"). NOT all-caps.
- **Secondary CTA:** `border border-kp-rule text-kp-ink px-6 py-3 rounded-kp-sm font-medium hover:bg-kp-mist`.
- **Tertiary / link:** plain text, `text-kp-blue underline-offset-2 hover:underline`.

## What this means for our existing surfaces

We are **not** redesigning the entire app for Kapitus. The branch is for whatever Kapitus-specific marketing surface they need — likely a dedicated landing page or set of pages they can point at, while the app underneath stays Mission Brief.

Suggested initial scope:

1. **`/clients/kapitus`** — a marketing landing page that uses these tokens, sells LevelUp's AI training to financial-services SMBs in Kapitus's voice.
2. A scoped `<KapitusLayout>` wrapper that swaps the design tokens at the route level (using a CSS class on `<html>` or a context provider) so the rest of the app keeps Mission Brief.
3. Optionally: a dedicated `<KapitusNav>` and `<KapitusFooter>` with Kapitus-style chrome.

Phase 2 (when client buys in deeper):
- Co-branded sign-up flow at `/clients/kapitus/sign-up` that pre-fills "Industry: Financial Services" and routes to a Kapitus-specific onboarding cohort.
- Kapitus-themed certificate template (the cert PDF generator can branch on `org.industry === 'FINANCIAL_SERVICES_KAPITUS'`).

## What stays unchanged

- All Mission Brief design tokens and primitives in `packages/ui` — untouched.
- Existing routes (`/`, `/pricing`, `/governance`, `/admin`, `/learn`, etc.) — untouched.
- Auth, billing, governance, content — untouched.

## Implementation strategy

When ready, dispatch an agent with this spec. Likely commit chain:
1. Add tokens to `packages/ui/src/styles/kapitus.css` (alongside `globals.css`).
2. Add Tailwind preset extension `packages/ui/kapitus-tailwind.config.ts` that exports the kp-* color/spacing tokens.
3. Build `apps/web/src/components/kapitus/{nav,footer,hero,steps,plan-card}.tsx`.
4. Build `apps/web/src/app/clients/kapitus/page.tsx` with the full landing layout.
5. Take a screenshot, iterate against the live kapitus.com reference.

## Approval checkpoint before we ship

- Side-by-side compare: kapitus.com vs `/clients/kapitus` — hero, CTAs, card grid, color palette, typography hierarchy.
- Run the sales narrative against a friendly Kapitus-equivalent buyer ("would you click 'Apply now' from this page?").
- A11y pass: WCAG AA contrast on every text/background pair (financial-services compliance).
