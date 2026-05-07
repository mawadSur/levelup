import type { OnApplicationShutdown } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { shutdownAnalytics } from '@levelup/analytics';

/**
 * Thin NestJS wrapper around the @levelup/analytics package.
 *
 * Responsibilities:
 *  - Calls `shutdownAnalytics()` when the application shuts down gracefully so
 *    the PostHog client's in-memory batch queue is flushed before the process
 *    exits. Without this, events captured in the last flush interval could be
 *    silently dropped.
 *  - Provides a single DI injection point if we ever need server-side feature
 *    flag evaluation via the PostHog Decide API (v2).
 *
 * Event captures are NOT performed through this service — callers import
 * `track` / `captureEvent` from `@levelup/analytics` directly. This keeps the
 * capture call sites one-liners with no constructor injection required.
 */
@Injectable()
export class AnalyticsService implements OnApplicationShutdown {
  private readonly logger = new Logger(AnalyticsService.name);

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Flushing PostHog analytics queue on shutdown (signal=${signal ?? 'none'})`);
    try {
      await shutdownAnalytics();
    } catch (err) {
      // Log but do not re-throw — a failed flush must not abort the shutdown
      // sequence for the rest of the application.
      this.logger.warn('PostHog flush on shutdown failed', err);
    }
  }
}
