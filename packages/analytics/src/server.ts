import { PostHog } from 'posthog-node';
import type { AnalyticsIdentity, AnalyticsOrgIdentity, EventName, EventProps } from './types';

let _client: PostHog | null = null;
let _warnedDisabled = false;

function getClient(): PostHog | null {
  const apiKey = process.env['POSTHOG_API_KEY'];
  if (!apiKey || apiKey.startsWith('PLACEHOLDER_')) {
    if (!_warnedDisabled) {
      _warnedDisabled = true;
      // One-time startup warning — not thrown, just logged.
      console.warn('[analytics] PostHog disabled (no API key set). All captures are no-ops.');
    }
    return null;
  }
  if (!_client) {
    _client = new PostHog(apiKey, {
      host: process.env['POSTHOG_HOST'] ?? 'https://us.i.posthog.com',
      // Flush in batches of 20 or every 10 s — reduces HTTP overhead on busy
      // servers while still delivering events in near-real-time.
      flushAt: 20,
      flushInterval: 10_000,
    });
  }
  return _client;
}

export function captureEvent<E extends EventName>(name: E, props: EventProps<E>): void {
  const client = getClient();
  if (!client) return;

  // props is a branded intersection; pull out the two routing fields, pass
  // the rest as PostHog properties.
  const { userId, organizationId, ...rest } = props as BaseProps;

  try {
    client.capture({
      distinctId: userId ?? organizationId,
      event: name,
      properties: { organizationId, ...rest },
      groups: { organization: organizationId },
    });
  } catch {
    // Swallow — analytics must never propagate errors to callers.
  }
}

// Narrow internal type used above when destructuring.
interface BaseProps {
  userId?: string;
  organizationId: string;
  [key: string]: unknown;
}

export function identifyUser(identity: AnalyticsIdentity): void {
  const client = getClient();
  if (!client) return;

  try {
    const { userId, organizationId, ...traits } = identity;
    client.identify({
      distinctId: userId,
      properties: { organizationId, ...(traits as Record<string, unknown>) },
    });
    client.groupIdentify({
      groupType: 'organization',
      groupKey: organizationId,
      properties: {},
    });
  } catch {
    // Swallow
  }
}

export function identifyOrg(identity: AnalyticsOrgIdentity): void {
  const client = getClient();
  if (!client) return;

  try {
    const { organizationId, ...traits } = identity;
    client.groupIdentify({
      groupType: 'organization',
      groupKey: organizationId,
      properties: traits as Record<string, unknown>,
    });
  } catch {
    // Swallow
  }
}

export async function shutdownAnalytics(): Promise<void> {
  if (_client) {
    await _client.shutdown();
    _client = null;
  }
}
