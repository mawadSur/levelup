import { z } from 'zod';

/**
 * Body of `PATCH /integrations/slack/monitored-channels`.
 *
 * The admin sends the COMPLETE list of channel ids they want monitored —
 * the server replaces the stored list rather than merging. We cap the list
 * to 200 to keep the JSON column under any reasonable size and stop a
 * pathological admin from opting in to an entire workspace.
 */
export const slackMonitoredChannelsSchema = z.object({
  channelIds: z
    .array(
      z
        .string()
        .min(1)
        .max(32)
        .regex(/^[CG][A-Z0-9]+$/, 'Channel IDs must match Slack format (e.g. C0123ABC)'),
    )
    .max(200),
});
export type SlackMonitoredChannelsInput = z.infer<typeof slackMonitoredChannelsSchema>;

/**
 * Body of `POST /integrations/slack/consent`.
 *
 * The admin acknowledges the privacy one-pager. We store the version they
 * accepted so a future policy bump can re-prompt without losing history.
 */
export const slackConsentSchema = z.object({
  consentVersion: z.string().min(1).max(32),
});
export type SlackConsentInput = z.infer<typeof slackConsentSchema>;
