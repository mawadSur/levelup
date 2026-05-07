/**
 * Slack OAuth v2 helpers.
 *
 * Two functions:
 *   - getInstallUrl: builds the URL to redirect the admin to for app install.
 *   - exchangeCode: POSTs the auth code back to Slack to receive bot tokens.
 *
 * Scopes default
 * --------------
 * The caller is expected to pass the explicit scope list. The integration
 * module wires up: `chat:write`, `commands`, `im:write`, `users:read`,
 * `users:read.email`, `team:read`. Each is required for one of the v1
 * features (DM digest delivery, `/levelup` slash command, email→userId
 * mapping). The list lives in the api module so the package stays focused
 * on protocol mechanics.
 */

import { callOauthV2Access } from './client';

export interface GetInstallUrlOptions {
  state: string;
  clientId: string;
  scopes: string[];
  redirectUri: string;
}

export function getInstallUrl(opts: GetInstallUrlOptions): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    scope: opts.scopes.join(','),
    redirect_uri: opts.redirectUri,
    state: opts.state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export interface ExchangeCodeOptions {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SlackOauthResult {
  /**
   * The user-token issued for the installer (authed_user.access_token).
   * For workspace-scoped installs this is sometimes empty; callers should
   * fall back to `botToken` for any API call that doesn't specifically need
   * an acting user identity.
   */
  accessToken: string;
  /** xoxb-… token for the bot user. Used for posting messages, DMs, etc. */
  botToken: string;
  /** Stable user id of the bot, returned by Slack at install time. */
  botUserId: string;
  teamId: string;
  teamName: string | null;
  scopes: string[];
}

export async function exchangeCode(opts: ExchangeCodeOptions): Promise<SlackOauthResult> {
  const resp = await callOauthV2Access({
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    code: opts.code,
    redirect_uri: opts.redirectUri,
  });

  if (!resp.ok) {
    throw new Error(`Slack oauth.v2.access failed: ${resp.error ?? 'unknown error'}`);
  }

  // Slack returns the bot token at the top-level `access_token` for
  // workspace-bot installs. The user token (if any) is on `authed_user`.
  const botToken = resp.access_token ?? '';
  if (!botToken) {
    throw new Error('Slack oauth.v2.access response missing access_token');
  }

  const userAccessToken = resp.authed_user?.access_token ?? botToken;
  const botUserId = resp.bot_user_id ?? '';
  const teamId = resp.team?.id ?? '';
  if (!teamId) {
    throw new Error('Slack oauth.v2.access response missing team.id');
  }
  const teamName = resp.team?.name ?? null;
  const scopes = (resp.scope ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    accessToken: userAccessToken,
    botToken,
    botUserId,
    teamId,
    teamName,
    scopes,
  };
}
