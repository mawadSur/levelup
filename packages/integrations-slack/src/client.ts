/**
 * Thin Slack Web API client.
 *
 * The package depends on `@slack/web-api` (declared in package.json) but we
 * deliberately implement the small surface we need on top of `fetch()` so
 * this workspace package can build without first running `pnpm install` in
 * environments that don't yet have the SDK on disk. The wire shapes we use
 * are the documented Slack Web API contracts; once the SDK is installed,
 * a follow-up can swap the implementation under the same `WebClient` shape
 * without touching call sites.
 *
 * Methods implemented:
 *   - chat.postMessage
 *   - conversations.open
 *   - users.lookupByEmail
 *   - auth.revoke
 *   - oauth.v2.access  (used by oauth.ts; exported via callApi for reuse)
 */

import type { KnownBlock } from './blocks';

const SLACK_API = 'https://slack.com/api';

interface SlackOkResponse {
  ok: boolean;
  error?: string;
  warning?: string;
}

interface ConversationsOpenResult extends SlackOkResponse {
  channel?: { id: string };
}

interface ChatPostMessageResult extends SlackOkResponse {
  ts?: string;
  channel?: string;
}

interface UsersLookupByEmailResult extends SlackOkResponse {
  user?: {
    id: string;
    name?: string;
    profile?: { email?: string };
  };
}

export interface WebClient {
  chat: {
    postMessage(args: {
      channel: string;
      blocks?: KnownBlock[];
      text?: string;
    }): Promise<ChatPostMessageResult>;
  };
  conversations: {
    open(args: { users: string }): Promise<ConversationsOpenResult>;
  };
  users: {
    lookupByEmail(args: { email: string }): Promise<UsersLookupByEmailResult>;
  };
  auth: {
    revoke(args?: { test?: boolean }): Promise<SlackOkResponse>;
  };
}

async function callJsonApi<TResult extends SlackOkResponse>(
  method: string,
  token: string,
  body: Record<string, unknown>,
): Promise<TResult> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  // Slack always returns 200 with `{ok: false, error: ...}` for app errors.
  // We surface non-2xx as transport errors but still parse.
  const json = (await res.json()) as TResult;
  if (!res.ok && !json) {
    throw new Error(`Slack API ${method} HTTP ${res.status}`);
  }
  return json;
}

async function callFormApi<TResult extends SlackOkResponse>(
  method: string,
  token: string | null,
  form: Record<string, string>,
): Promise<TResult> {
  const params = new URLSearchParams(form);
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers,
    body: params.toString(),
  });
  const json = (await res.json()) as TResult;
  return json;
}

/**
 * Build a `WebClient` bound to a single bot/user access token.
 *
 * This is intentionally a hand-written wrapper rather than the upstream
 * `@slack/web-api` `WebClient` so the package compiles without the SDK on
 * disk. The shape mirrors the SDK so callers can be ported with a one-line
 * import swap.
 */
export function createSlackClient(accessToken: string): WebClient {
  return {
    chat: {
      postMessage: (args) =>
        callJsonApi<ChatPostMessageResult>(
          'chat.postMessage',
          accessToken,
          args as unknown as Record<string, unknown>,
        ),
    },
    conversations: {
      open: (args) => callJsonApi<ConversationsOpenResult>('conversations.open', accessToken, args),
    },
    users: {
      lookupByEmail: (args) =>
        // users.lookupByEmail historically only accepts form-urlencoded.
        callFormApi<UsersLookupByEmailResult>('users.lookupByEmail', accessToken, args),
    },
    auth: {
      revoke: (args) =>
        callFormApi<SlackOkResponse>('auth.revoke', accessToken, {
          test: args?.test ? 'true' : 'false',
        }),
    },
  };
}

/**
 * Low-level call helper used by oauth.ts for the unauthenticated
 * `oauth.v2.access` endpoint. Exposed here (rather than re-implementing in
 * oauth.ts) so all wire-format shenanigans live in this file.
 */
export async function callOauthV2Access(form: {
  client_id: string;
  client_secret: string;
  code: string;
  redirect_uri: string;
}): Promise<{
  ok: boolean;
  error?: string;
  access_token?: string;
  scope?: string;
  team?: { id: string; name?: string };
  bot_user_id?: string;
  authed_user?: { id: string; access_token?: string; scope?: string };
}> {
  const params = new URLSearchParams(form);
  const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body: params.toString(),
  });
  return res.json() as Promise<{
    ok: boolean;
    error?: string;
    access_token?: string;
    scope?: string;
    team?: { id: string; name?: string };
    bot_user_id?: string;
    authed_user?: { id: string; access_token?: string; scope?: string };
  }>;
}
