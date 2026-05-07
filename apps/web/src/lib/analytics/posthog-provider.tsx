'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

/** Minimal session-user shape needed to identify the visitor. */
export interface AnalyticsUser {
  userId: string;
  organizationId: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  name?: string;
}

interface PostHogProviderProps {
  user: AnalyticsUser | null;
  children: React.ReactNode;
}

/**
 * Client-side PostHog provider.
 *
 * Design decisions:
 *  - `autocapture: false`          — explicit opt-in events only (privacy-first).
 *  - `disable_session_recording: true` — not enabled in v1; can be toggled
 *    later behind a PostHog feature flag once a data-retention policy is in
 *    place.
 *  - `capture_pageview: 'history_change'` — SPA-safe; fires on every client
 *    navigation without a full reload.
 *  - `persistence: 'localStorage'` — avoids third-party cookie classification
 *    under ITP / ETP; fine for a B2B SaaS where users are authenticated.
 *
 * Stub mode: when `NEXT_PUBLIC_POSTHOG_KEY` is absent or starts with
 * `PLACEHOLDER_`, the `init` call is skipped and no network requests are made.
 * Client-side `posthog.capture()` calls will silently no-op because the
 * library has not been initialised.
 */
export function PostHogProvider({ user, children }: PostHogProviderProps) {
  useEffect(() => {
    const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
    if (!key || key.startsWith('PLACEHOLDER_')) return;

    // Guard against double-init across React StrictMode double-invocations or
    // hot-module-replacement cycles. posthog-js exposes `__loaded` as a
    // semi-private flag; checking it is the recommended pattern per PostHog
    // docs for frameworks that call init outside a singleton boundary.
    if (!posthog.__loaded) {
      posthog.init(key, {
        api_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://us.i.posthog.com',
        // SPA-safe pageview capture — fires on every client navigation.
        capture_pageview: 'history_change',
        // Privacy-first defaults:
        autocapture: false,
        disable_session_recording: true,
        // Avoid cookie classification; use localStorage instead.
        persistence: 'localStorage',
      });
    }

    if (user) {
      posthog.identify(user.userId, {
        email: user.email,
        name: user.name,
        role: user.role,
      });
      posthog.group('organization', user.organizationId);
    }
  }, [user]);

  return <>{children}</>;
}

/**
 * Hook returning the singleton `posthog` client. Components can call
 * `usePostHog().capture(...)` exactly as they would with `posthog-js/react`.
 * The library is a singleton, so we don't need real React context.
 */
export function usePostHog(): typeof posthog {
  return posthog;
}
