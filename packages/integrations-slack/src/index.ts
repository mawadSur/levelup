/**
 * @levelup/integrations-slack — Slack OAuth, encryption, and Block Kit helpers.
 *
 * The package isolates Slack-specific protocol concerns from the API. Callers
 * see a small TypeScript surface; the API never touches the Slack SDK
 * directly.
 */

export { encrypt, decrypt, _resetEncryptionForTests } from './encryption';

export { createSlackClient, type WebClient } from './client';

export {
  getInstallUrl,
  exchangeCode,
  type GetInstallUrlOptions,
  type ExchangeCodeOptions,
  type SlackOauthResult,
} from './oauth';

export {
  buildDigestBlocks,
  buildCoachResponseBlocks,
  type ManagerDigestPayload,
  type CoachOutputForBlocks,
  type KnownBlock,
  type SectionBlock,
  type DividerBlock,
  type HeaderBlock,
  type ContextBlock,
  type MrkdwnText,
  type PlainText,
} from './blocks';
