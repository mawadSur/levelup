import { z } from 'zod';

/**
 * Slack slash command payload (application/x-www-form-urlencoded).
 *
 * Slack guarantees these fields for slash commands; we only validate the
 * subset we actually use. `text` is the bit after the command name and may
 * be empty (e.g. user typed `/levelup` with no prompt).
 *
 * https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
export const slashCommandPayloadSchema = z.object({
  team_id: z.string().min(1),
  user_id: z.string().min(1),
  user_name: z.string().optional(),
  command: z.string().min(1),
  text: z.string().default(''),
  response_url: z.string().url(),
  trigger_id: z.string().optional(),
  channel_id: z.string().optional(),
  channel_name: z.string().optional(),
});
export type SlashCommandPayload = z.infer<typeof slashCommandPayloadSchema>;
