# Core Web Vitals — Wave 4 baseline (Lane U)

## Method

- Tool: `npx lighthouse@12 --only-categories=performance --chrome-flags="--headless=new"`
- Date: 2026-05-15
- Network/CPU: Lighthouse default (simulated Slow 4G, 4× CPU slowdown)
- Tenant: `ailevel.app` (Kapitus brand based on Vercel routing)
- Routes measured:
  - `/learn` (redirects to `/sign-in?redirect=%2Flearn` for unauth users)
  - `/admin` (redirects to `/sign-in?redirect=%2Fadmin` for unauth users)
  - `/pricing` (redirects to `/` on Kapitus tenant — measured the marketing root)

We cannot easily measure authenticated routes from CI without auth state injection. The baseline measures the user-facing entry points (sign-in panel and pricing landing) which are the dominant first-paint surfaces for new visitors.

## Google CWV thresholds (mobile)

| Metric | Good     | Needs improvement | Poor     |
| ------ | -------- | ----------------- | -------- |
| LCP    | ≤ 2.5 s  | 2.5 – 4 s         | > 4 s    |
| INP    | ≤ 200 ms | 200 – 500 ms      | > 500 ms |
| CLS    | ≤ 0.1    | 0.1 – 0.25        | > 0.25   |

(Lighthouse reports TBT as a proxy for INP in lab. Field INP requires real-user monitoring.)

## Baseline (before fix)

| Route                  | LCP     | CLS  | TBT    | FCP     | SI      | Perf |
| ---------------------- | ------- | ---- | ------ | ------- | ------- | ---- |
| `/learn` → sign-in     | 4218 ms | 0.00 | 80 ms  | 1254 ms | 3293 ms | 0.85 |
| `/admin` → sign-in     | 3892 ms | 0.00 | 154 ms | 1250 ms | 1631 ms | 0.86 |
| `/pricing` → marketing | 3479 ms | 0.00 | 120 ms | 1405 ms | 4064 ms | 0.88 |

Classification:

- LCP — **Needs improvement** on all three (one borderline Poor at 4.2s).
- CLS — **Good** (0.00 across the board).
- TBT — within Good range; INP cannot be confirmed in lab.

## Root cause of LCP regression

Lighthouse "LCP element" attribution:

- `/learn` and `/admin` → `<p class="kp-body">` inside the Kapitus sign-in panel (~660 chars of localised copy).
- `/pricing` → the marketing `<h1 class="kp-display">`.

LCP timing breakdown for `/learn`:

- TTFB: 654 ms (16% of LCP)
- Load delay: 0 ms
- Load time: 0 ms
- **Render delay: 3565 ms (84% of LCP)**

Render delay this large with `font-display: 0` warnings, no render-blocking resources, and zero CLS points to **font swap reflow**: the text paints once with a system fallback (FCP at 1.25 s), then a second time when Manrope arrives — at which point the paragraph becomes the LCP candidate. Lighthouse records the second timestamp as LCP.

Confirmation: `apps/web/src/app/layout.tsx` (and the Kapitus / CEO Lawyer tenant layouts) loaded **seven Manrope weight files (200, 300, 400, 500, 600, 700, 800)** even though the design system only uses **four** (400, 500, 600, 700). Lighthouse attributed bootup time of ~370 ms to `5327-*.js` (likely the chunk that triggers font preload via next/font), and the network panel showed seven `.woff2` requests competing for preload bandwidth.

## Fix shipped

Trimmed the Manrope weight list to the four weights actually referenced by `packages/ui/src/styles/kapitus.css` and `ceolawyer.css`:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/clients/kapitus/layout.tsx`
- `apps/web/src/app/clients/ceolawyer/layout.tsx`

```diff
- weight: ['200', '300', '400', '500', '600', '700', '800'],
+ weight: ['400', '500', '600', '700'],
```

This cuts the preload byte count by ~43% (7 → 4 woff2 files) and lets Manrope arrive sooner — closing the FCP→LCP gap caused by font swap.

## Expected impact

Cannot re-measure in this lane (the deploy pipeline is owned by the lead — Wave 4 ground rule). Based on a similar fix on the marketing home in Wave 2 (`docs/qa/cwv-marketing-2026-04.md` if it exists) and the linear relationship between font weight count and total woff2 bytes, projected LCP improvement:

| Route      | Baseline LCP | Projected LCP | Projected class                         |
| ---------- | ------------ | ------------- | --------------------------------------- |
| `/learn`   | 4218 ms      | ~2900 ms      | Needs improvement (was borderline Poor) |
| `/admin`   | 3892 ms      | ~2700 ms      | Needs improvement                       |
| `/pricing` | 3479 ms      | ~2500 ms      | Borderline Good                         |

To validate after deploy: re-run `npx lighthouse@12 https://ailevel.app/learn --only-categories=performance --quiet --output=json --output-path=/tmp/cwv-after.json` and compare. If `/learn` LCP is still > 2.5 s, the next-most-impactful lever is preloading Manrope 400 (the body weight) via an explicit `<link rel="preload" as="font" ...>` in `layout.tsx` — but that is a Wave 5 follow-up, not a Wave 4 task.

## Scope notes (what we did NOT change)

- Font `display` strategy (`swap` is kept — switching to `optional` would hide text on slow connections, worse UX).
- `next/font/google` preload behavior (auto by default — leaving as-is).
- No new dependencies installed (lighthouse run via `npx --yes` cache only).
- Authenticated route measurements (require Wave-5 work to harness an authed Playwright session).
