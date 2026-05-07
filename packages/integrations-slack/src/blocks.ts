/**
 * Slack Block Kit builders.
 *
 * We define a minimal `KnownBlock` union compatible with the upstream
 * `@slack/web-api` types we replace inline. When the SDK is installed, the
 * Block Kit shapes match field-for-field — the names below were copied from
 * the official type definitions.
 *
 * Limits Slack enforces and we respect:
 *   - Up to 50 blocks per message
 *   - Up to 3000 chars in any single text element
 *   - mrkdwn `text` is the safe default; we trim long fields rather than
 *     truncating mid-line so we don't break formatting in the client.
 */

const MAX_TEXT_CHARS = 2900; // leave headroom under Slack's 3000 cap
const MAX_BLOCKS = 50;

// ---------------------------------------------------------------------------
// Block Kit type surface — compatible subset of @slack/web-api KnownBlock
// ---------------------------------------------------------------------------

export interface MrkdwnText {
  type: 'mrkdwn';
  text: string;
}
export interface PlainText {
  type: 'plain_text';
  text: string;
  emoji?: boolean;
}

export interface SectionBlock {
  type: 'section';
  text?: MrkdwnText | PlainText;
  fields?: Array<MrkdwnText | PlainText>;
}
export interface DividerBlock {
  type: 'divider';
}
export interface HeaderBlock {
  type: 'header';
  text: PlainText;
}
export interface ContextBlock {
  type: 'context';
  elements: Array<MrkdwnText | PlainText>;
}

export type KnownBlock = SectionBlock | DividerBlock | HeaderBlock | ContextBlock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(text: string, max: number = MAX_TEXT_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function section(textMarkdown: string): SectionBlock {
  return {
    type: 'section',
    text: { type: 'mrkdwn', text: clamp(textMarkdown) },
  };
}

function header(text: string): HeaderBlock {
  // Plain text headers are limited to 150 chars — clamp aggressively.
  return {
    type: 'header',
    text: { type: 'plain_text', text: clamp(text, 140), emoji: true },
  };
}

function trimToBlockLimit(blocks: KnownBlock[]): KnownBlock[] {
  if (blocks.length <= MAX_BLOCKS) return blocks;
  return blocks.slice(0, MAX_BLOCKS);
}

// ---------------------------------------------------------------------------
// Manager digest
// ---------------------------------------------------------------------------

export interface ManagerDigestPayload {
  managerName: string;
  orgName: string;
  periodLabel: string;
  completionPct: number;
  totalLearners: number;
  completedLearners: number;
  riskFlags: Array<{ label: string; count: number }>;
  topMovers?: Array<{ name: string; xp: number }>;
  /** Optional deep link back into the LevelUp web app (e.g. /admin/reports). */
  reportUrl?: string;
}

export function buildDigestBlocks(input: ManagerDigestPayload): KnownBlock[] {
  const blocks: KnownBlock[] = [];

  blocks.push(header(`Weekly digest — ${input.orgName}`));
  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `*Period:* ${input.periodLabel}` },
      { type: 'mrkdwn', text: `*For:* ${input.managerName}` },
    ],
  });
  blocks.push({ type: 'divider' });

  blocks.push({
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: `*Completion*\n${input.completionPct}% (${input.completedLearners} / ${input.totalLearners})`,
      },
      {
        type: 'mrkdwn',
        text: `*Team size*\n${input.totalLearners} learners`,
      },
    ],
  });

  if (input.riskFlags.length > 0) {
    blocks.push(section('*Top risk flags*'));
    const lines = input.riskFlags.map((f) => `• ${f.label} — *${f.count}*`).join('\n');
    blocks.push(section(lines));
  } else {
    blocks.push(section('*Top risk flags*\n_No flagged issues this period._'));
  }

  if (input.topMovers && input.topMovers.length > 0) {
    blocks.push(section('*Top XP earners (7d)*'));
    const lines = input.topMovers.map((m, i) => `${i + 1}. ${m.name} — *${m.xp} XP*`).join('\n');
    blocks.push(section(lines));
  }

  if (input.reportUrl) {
    blocks.push({ type: 'divider' });
    blocks.push(section(`<${input.reportUrl}|Open the full report →>`));
  }

  return trimToBlockLimit(blocks);
}

// ---------------------------------------------------------------------------
// Coach response (for `/levelup` slash command)
// ---------------------------------------------------------------------------

export interface CoachOutputForBlocks {
  explanation: string;
  improvedPrompt?: string;
  whyItWorks?: string;
  nextAction?: string;
  sensitiveDataWarning?: { triggered: boolean; reason?: string | null };
}

export function buildCoachResponseBlocks(output: CoachOutputForBlocks): KnownBlock[] {
  const blocks: KnownBlock[] = [];

  blocks.push(header('LevelUp Coach'));

  if (output.sensitiveDataWarning?.triggered) {
    blocks.push(
      section(
        ':warning: *Sensitive data detected.* The coach skipped the LLM call. ' +
          (output.sensitiveDataWarning.reason ??
            'Please rewrite without confidential, personal, or customer data.'),
      ),
    );
    return trimToBlockLimit(blocks);
  }

  blocks.push(section(output.explanation || '_(no explanation produced)_'));

  if (output.improvedPrompt && output.improvedPrompt.trim().length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push(section('*Improved prompt*'));
    // Wrap improved prompt in a fenced code block so Slack renders it
    // monospaced and copy-friendly.
    blocks.push(section('```\n' + clamp(output.improvedPrompt, 2700) + '\n```'));
    if (output.whyItWorks && output.whyItWorks.trim().length > 0) {
      blocks.push(section(`*Why it works*\n${output.whyItWorks}`));
    }
  }

  if (output.nextAction && output.nextAction.trim().length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push(section(`*Next action*\n${output.nextAction}`));
  }

  return trimToBlockLimit(blocks);
}
