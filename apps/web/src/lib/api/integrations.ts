import { apiGet, apiDelete, apiPatch, apiPost } from './client';
import type { IntegrationSummary } from '@levelup/types';

export async function list(): Promise<IntegrationSummary[]> {
  return apiGet<IntegrationSummary[]>('/integrations');
}

export async function remove(provider: 'SLACK' | 'MS_TEAMS'): Promise<{ ok: true }> {
  return apiDelete<{ ok: true }>(`/integrations/${provider}`);
}

// -- Slack DLP scanner -------------------------------------------------------

export interface SlackChannelSummary {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  monitored: boolean;
}

export interface SlackMonitoredChannelsResponse {
  channels: SlackChannelSummary[];
  monitoredChannels: string[];
  consentVersion: string | null;
}

export async function listSlackMonitoredChannels(): Promise<SlackMonitoredChannelsResponse> {
  return apiGet<SlackMonitoredChannelsResponse>('/integrations/slack/monitored-channels');
}

export async function updateSlackMonitoredChannels(
  channelIds: string[],
): Promise<{ monitoredChannels: string[] }> {
  return apiPatch<{ channelIds: string[] }, { monitoredChannels: string[] }>(
    '/integrations/slack/monitored-channels',
    { channelIds },
  );
}

export async function acceptSlackConsent(
  consentVersion: string,
): Promise<{ consentVersion: string }> {
  return apiPost<{ consentVersion: string }, { consentVersion: string }>(
    '/integrations/slack/consent',
    { consentVersion },
  );
}
