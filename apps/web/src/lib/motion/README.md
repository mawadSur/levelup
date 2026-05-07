# Motion System — LevelUp AI Academy

All animation primitives for the web app. Built on top of [`motion`](https://motion.dev) v11+ (`motion/react` imports).

## Reduced-Motion Policy

Every animation in this system respects `prefers-reduced-motion`. When the OS/browser setting is active:

- `<ScrollReveal>` renders a plain `<div>` — no entrance animation.
- `<Stagger>` and `<ScrollItem>` render plain `<div>` elements.
- `<CountUp>` skips the count animation and renders the final value immediately.
- `<AnimatedProgressBar>` fills instantly (no glow).
- `PathCard` 3D tilt is disabled entirely.
- `NavItem` layout transition is bypassed.

All components call `useReducedMotion()` from `motion/react` internally.
You can also use the exported `withReducedMotion(variants, reduce)` helper to flatten variant objects manually.

---

## Easing Presets (`variants.ts`)

```ts
import { easeStandard, easeQuick, easeSpring, easeBounce } from '@/lib/motion/variants';
```

| Export         | Type         | Use                                     |
| -------------- | ------------ | --------------------------------------- |
| `easeStandard` | `Transition` | Default page/section entrances (0.55 s) |
| `easeQuick`    | `Transition` | Fast micro-interactions (0.25 s)        |
| `easeSpring`   | `Transition` | Cards, modals — natural overshoot       |
| `easeBounce`   | `Transition` | Playful confirmations                   |

---

## Variant Presets (`variants.ts`)

```ts
import {
  fadeUp,
  fadeIn,
  scaleIn,
  slideRight,
  staggerChildren,
  correctBounce,
  wrongShake,
} from '@/lib/motion/variants';
```

Use these directly with `motion` components:

```tsx
<motion.div variants={fadeUp} initial="hidden" animate="visible" />
```

### `staggerChildren(delayChildren?, staggerAmount?)`

Returns a parent variant that orchestrates child animations:

```tsx
<motion.ul variants={staggerChildren(0.05, 0.08)} initial="hidden" animate="visible">
  <motion.li variants={fadeUp}>Item 1</motion.li>
  <motion.li variants={fadeUp}>Item 2</motion.li>
</motion.ul>
```

---

## Components

### `<ScrollReveal>`

Animates children into view once as they enter the viewport.

```tsx
import { ScrollReveal } from '@/lib/motion/scroll-reveal';

<ScrollReveal delay={0.1} variants={fadeUp}>
  <h2>Section title</h2>
</ScrollReveal>;
```

Props: `delay?`, `variants?` (default `fadeUp`), `className?`.

---

### `<Stagger>` + `<ScrollItem>`

Staggered entrance for a list of items.

```tsx
import { Stagger, ScrollItem } from '@/lib/motion/stagger';

<Stagger className="grid gap-6 sm:grid-cols-3">
  {items.map((item) => (
    <ScrollItem key={item.id}>
      <Card>{item.title}</Card>
    </ScrollItem>
  ))}
</Stagger>;
```

`<ScrollItem>` accepts an optional `variants` prop (default `fadeUp`).

---

### `<CountUp>`

Animates a number from 0 to `value` on mount.

```tsx
import { CountUp } from '@/lib/motion/count-up';

<CountUp value={1_248} duration={1.4} />
// With custom formatter:
<CountUp value={0.73} format={(n) => `${n}%`} />
```

---

### `<RouteTransitions>`

Optional. Plays the native View Transitions API animation on route changes.
Mount it once in any route-group layout:

```tsx
// app/(marketing)/layout.tsx
import { RouteTransitions } from '@/lib/motion/route-transitions';

export default function Layout({ children }) {
  return (
    <>
      <RouteTransitions />
      {children}
    </>
  );
}
```

The animation is controlled by `::view-transition-*` CSS rules in `globals.css`.
Falls back silently in unsupported browsers (Firefox < 126, Safari < 18).

---

## Bundle impact

`motion/react` uses tree-shaking. Only import the hooks/components you use.
Avoid importing the full `motion` namespace (`import * as motion from 'motion/react'`).
