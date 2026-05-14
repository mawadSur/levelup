import { z } from 'zod';

/**
 * Slack Events API envelope.
 *
 * The endpoint receives two top-level shapes:
 *   1. `type: 'url_verification'` — the one-shot challenge during app config.
 *   2. `type: 'event_callback'`  — every other event, with the actual event
 *      payload nested under `event`.
 *
 * We deliberately keep the inner `event` typing loose (`.passthrough()`)
 * because event shapes vary per type. The DLP scanner reads `text`,
 * `channel`, `user`, `subtype`, `bot_id`, `channel_type`, `ts` when present.
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
        subtype: z.string().optional(),
        channel: z.string().optional(),
        channel_type: z.string().optional(),
        user: z.string().optional(),
        bot_id: z.string().optional(),
        text: z.string().optional(),
        ts: z.string().optional(),
        thread_ts: z.string().optional(),
      })
      .passthrough(),
  }),
]);
export type SlackEventEnvelope = z.infer<typeof slackEventEnvelopeSchema>;
