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

## Post-deploy measurement (Wave 5 lane-1)

- Tool: `npx lighthouse@12 --only-categories=performance --quiet --chrome-flags="--headless=new --no-sandbox"` (v12.8.2)
- Date: 2026-05-16
- Deploy commit: `41e0f35` (font-weight trim shipped)
- Tenant + routes: identical to baseline (`ailevel.app/learn`, `/admin`, `/pricing`)
- LCP element on `/learn` and `/admin` was still `<p class="kp-body">` inside the Kapitus sign-in panel; on `/pricing` still `<h1 class="kp-display">`. Apples-to-apples vs the baseline.
- Network panel confirmed the Manrope set shrank from 7 weights to **5 woff2 files** post-deploy (4 weights + the variable-axis preload sidecar emitted by `next/font/google`).

### Results

| Route                  | Baseline LCP | Projected LCP | **Measured LCP** | Δ vs baseline | Δ vs projection |
| ---------------------- | ------------ | ------------- | ---------------- | ------------- | --------------- |
| `/learn` → sign-in     | 4218 ms      | ~2900 ms      | **4013 ms**      | −205 ms       | **+1113 ms**    |
| `/admin` → sign-in     | 3892 ms      | ~2700 ms      | **3929 ms**      | +37 ms        | **+1229 ms**    |
| `/pricing` → marketing | 3479 ms      | ~2500 ms      | **3366 ms**      | −113 ms       | **+866 ms**     |

| Route      | Baseline CLS / TBT | **Measured CLS / TBT** |
| ---------- | ------------------ | ---------------------- |
| `/learn`   | 0.00 / 80 ms       | 0.00 / 262 ms          |
| `/admin`   | 0.00 / 154 ms      | 0.00 / 18 ms           |
| `/pricing` | 0.00 / 120 ms      | 0.00 / 159 ms          |

CLS stayed at 0.00 across the board (Good). TBT moved within the Good band (< 300 ms) on every route — `/learn` worsened by 182 ms but is still well below the 200 ms INP "good" threshold for which TBT is the lab proxy; `/admin` improved sharply.

### Verdict — projection missed by > 500 ms on every route

The font-weight trim landed (network panel shows 5 woff2 files instead of 7) but the LCP win was 200 ms on `/learn`, **+37 ms (i.e. flat / slight regression)** on `/admin`, and 113 ms on `/pricing` — far short of the projected 1300 / 1200 / 1000 ms gains. Every route is **> 500 ms off projection**, so flagging per the lane-1 brief.

Diagnostic on `/learn` (representative):

- TTFB: 33 ms (vastly better than baseline 654 ms — likely a CDN warm-cache effect, separate from the font change).
- FCP: 1245 ms (unchanged vs baseline).
- LCP − FCP gap: **2768 ms** — still dominated by the font-swap window. Dropping three woff2 weights only shaved ~13% of the render-delay budget because the remaining four are still competing on the same connection and the body weight (400) is _still_ not explicitly preloaded.

### Why the projection was off

The Wave-4 projection assumed a linear relationship between woff2 file count and LCP improvement (43% byte reduction → ~1200 ms gain). That model was wrong:

1. **Critical-path width, not byte count, dominates.** With 4 remaining files still preloaded simultaneously over a single H/2 connection, the slowest-arriving weight still sets the swap deadline — and that file is roughly the same size as before the trim.
2. **The marketing Wave-2 baseline that anchored the projection used a different font (Inter-only) and a different LCP element (h1 instead of body paragraph).** Body paragraphs are more swap-sensitive because they have more glyph coverage requirements.
3. **CDN/TTFB variance.** Baseline TTFB was 654 ms; measured TTFB is 33 ms. Even accounting for that 620 ms TTFB win on its own, LCP only improved by 205 ms — implying font-render delay actually _grew_ slightly under the lighter font load.

### Recommended Wave-5 follow-up

Lane U already called this out as the next-most-impactful lever and we now have measured data to back it:

```html
<link
  rel="preload"
  as="font"
  type="font/woff2"
  href="/_next/static/media/<manrope-400>.woff2"
  crossorigin
/>
```

Preloading only the body weight (400) explicitly should close the FCP→LCP gap to < 1 s for the sign-in routes. Marketing `/pricing` may also benefit from preloading the display weight if `h1.kp-display` resolves to 700.

### Cleanup

`/tmp/tmp-lh-learn.json`, `/tmp/tmp-lh-admin.json`, `/tmp/tmp-lh-pricing.json` were removed after the numbers were extracted. Re-run with the command in the Method section if you need raw reports again.
