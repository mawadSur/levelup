// Public surface of @levelup/analytics.
//
// Server-side: captureEvent / identifyUser / identifyOrg / shutdownAnalytics
// Convenience wrappers: track.*
// Types: re-exported so callers share the same event taxonomy.

export { captureEvent, identifyUser, identifyOrg, shutdownAnalytics } from './server';
export { track } from './events';
export type {
  AnalyticsIdentity,
  AnalyticsOrgIdentity,
  EventName,
  EventProps,
  BaseEventProps,
} from './types';
