# @levelup/analytics

Shared PostHog analytics package for LevelUp AI Academy. Centralises the typed
event taxonomy so server (NestJS API) and client (Next.js web) never drift on
event names or property shapes.

## Usage — server side

```ts
import { track, captureEvent, identifyUser, shutdownAnalytics } from '@levelup/analytics';

// Type-safe helper
track.lessonCompleted({ organizationId, userId, lessonId, pathId, firstTime });

// Generic escape hatch
captureEvent('path_completed', { organizationId, userId, pathId, totalLessons: 5 });
```

## Stub mode

When `POSTHOG_API_KEY` is absent or begins with `PLACEHOLDER_`, all calls are
no-ops. A one-time warning is logged to `console.warn`. No errors are thrown,
so local dev works without any PostHog account.

## Env vars

| Variable          | Required | Default                    |
| ----------------- | -------- | -------------------------- |
| `POSTHOG_API_KEY` | No       | — (stub mode)              |
| `POSTHOG_HOST`    | No       | `https://us.i.posthog.com` |

## Event taxonomy

See `src/types.ts` for the full `EventName` union and per-event `EventProps`
conditional type. Convenience wrappers for the most common events live in
`src/events.ts` (`track.*`).

## Shutdown

Call `shutdownAnalytics()` on graceful shutdown so the in-memory queue is
flushed before the process exits.
