import { z } from 'zod';

/**
 * Slack Events API envelope.
 *
 * The endpoint receives two top-level shapes:
 *   1. `type: 'url_verification'` — the one-shot challenge during app config.
 *   2. `type: 'event_callback'`  — every other event, with the actual event
 *      payload nested under `event`.
 *
 * We deliberately keep the inner `event` typing loose (z.record(z.unknown()))
 * because we currently only branch on `event.type === 'app_uninstalled'` and
 * the rest of the payload varies per event type.
 */
export const slackEventEnvelopeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('url_verification'),
    challenge: z.string(),
  }),
  z.object({
    type: z.literal('event_callback'),
    team_id: z.string().min(1),
    event: z
      .object({
        type: z.string(),
      })
      .passthrough(),
  }),
]);
export type SlackEventEnvelope = z.infer<typeof slackEventEnvelopeSchema>;
