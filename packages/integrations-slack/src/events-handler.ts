/**
 * Slack Events API handler — DLP scanner branch.
 *
 * Given a parsed `message.channels` / `message.im` event, this module:
 *   1. Calls `scanIncomingMessage` against the message text.
 *   2. If flagged, posts an ephemeral reply to the sender via
 *      `chat.postEphemeral` — only the sender ever sees it.
 *   3. Returns a structured `SlackEventAction` describing what happened, so
 *      the API module can audit-log without re-implementing the decision tree.
 *
 * Why a separate module?
 * ----------------------
 * The HTTP plumbing (signature verification, body parsing, audit writes,
 * incident enqueue) stays in the NestJS controller / service. Everything
 * here is a pure async function: easy to unit-test, no NestJS imports, no
 * Prisma. The handler accepts a `WebClient`-shaped object so tests can stub
 * the Slack network calls with two lines of code.
 *
 * Pure-bot-message filter
 * -----------------------
 * Slack re-emits the bot's own posts as `message` events; if we scanned those
 * we'd loop on our own ephemerals. Callers pass the bot user id and we drop
 * any event whose `user` field matches.
 */

import { scanIncomingMessage, type SlackScanResult } from './scanner';
import type { WebClient } from './client';

export interface SlackMessageEvent {
  type: string;
  /** Channel-message subtypes (`message_changed`, `bot_message`, etc.) */
  subtype?: string;
  channel?: string;
  channel_type?: string;
  user?: string;
  bot_id?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
}

export type SlackEventAction =
  | { action: 'ignored'; reason: string }
  | { action: 'not_flagged' }
  | {
      action: 'warned';
      scan: SlackScanResult;
      ephemeralPosted: boolean;
      ephemeralError?: string;
    };

export interface HandleMessageOptions {
  /** Slack `message` event payload (already parsed). */
  event: SlackMessageEvent;
  /** Channels the org's admin has opted in for scanning. */
  monitoredChannels: ReadonlySet<string>;
  /** The bot's Slack user id (so we skip its own posts). */
  botUserId: string | null;
  /** Web client bound to the org's bot token. */
  client: Pick<WebClient, 'chat'>;
  /**
   * Optional scanner override — defaults to `scanIncomingMessage`. Tests
   * inject a deterministic stub; production code uses the default.
   */
  scan?: (text: string) => Promise<SlackScanResult>;
}

/**
 * Build the ephemeral warning text. Kept terse — Slack ephemerals are read
 * in-line, not opened in a modal.
 */
export function buildWarningText(scan: SlackScanResult): string {
  const category = scan.categories[0] ?? 'sensitive data';
  const lead =
    category === 'credentials'
      ? 'This message looks like it contains a secret or API key.'
      : category === 'phi'
        ? 'This message looks like it contains protected health information.'
        : category === 'payment'
          ? 'This message looks like it contains payment card / bank data.'
          : category === 'customer_data'
            ? 'This message looks like it contains customer records.'
            : 'This message looks like it contains personal data.';
  const hint = scan.suggestedRewrite ? ` ${scan.suggestedRewrite}` : ' Want to reword?';
  return `:warning: ${lead}${hint} (Only you see this — LevelUp scans for sensitive data per your org policy.)`;
}

/**
 * Decide what to do for a single `message` event and execute the side
 * effect (post an ephemeral if needed). Returns a structured action so the
 * caller can audit-log without duplicating the decision logic.
 */
export async function handleSlackMessageEvent(
  opts: HandleMessageOptions,
): Promise<SlackEventAction> {
  const { event, monitoredChannels, botUserId, client } = opts;
  const scan = opts.scan ?? scanIncomingMessage;

  // -- structural filters ----------------------------------------------------
  // We only act on plain user-authored messages — Slack uses subtypes like
  // `bot_message`, `message_changed`, `channel_join`, etc. for everything
  // else, and re-scanning those creates noise and loops.
  if (event.subtype) {
    return { action: 'ignored', reason: `subtype:${event.subtype}` };
  }
  if (event.bot_id) {
    return { action: 'ignored', reason: 'bot_id_present' };
  }
  if (botUserId && event.user && event.user === botUserId) {
    return { action: 'ignored', reason: 'self_message' };
  }
  if (!event.channel) {
    return { action: 'ignored', reason: 'no_channel' };
  }
  if (!event.user) {
    return { action: 'ignored', reason: 'no_user' };
  }
  if (!event.text || event.text.trim().length === 0) {
    return { action: 'ignored', reason: 'empty_text' };
  }

  // -- per-channel opt-in ----------------------------------------------------
  if (!monitoredChannels.has(event.channel)) {
    return { action: 'ignored', reason: 'channel_not_monitored' };
  }

  // -- scan ------------------------------------------------------------------
  const result = await scan(event.text);
  if (!result.flagged) {
    return { action: 'not_flagged' };
  }

  // -- ephemeral reply -------------------------------------------------------
  const text = buildWarningText(result);
  let ephemeralPosted = false;
  let ephemeralError: string | undefined;
  try {
    const resp = await client.chat.postEphemeral({
      channel: event.channel,
      user: event.user,
      text,
    });
    if (resp.ok) {
      ephemeralPosted = true;
    } else {
      ephemeralError = resp.error ?? 'unknown_error';
    }
  } catch (err) {
    ephemeralError = err instanceof Error ? err.message : String(err);
  }

  const out: SlackEventAction = {
    action: 'warned',
    scan: result,
    ephemeralPosted,
  };
  if (ephemeralError) out.ephemeralError = ephemeralError;
  return out;
}
