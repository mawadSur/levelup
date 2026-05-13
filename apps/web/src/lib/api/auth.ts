import { apiGet, apiPost } from './client';
import {
  acceptInvitationSchema,
  sessionUserSchema,
  type AcceptInvitationInput,
  type SessionUser,
} from '@levelup/types';

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Audit-log a sign-out event on the API. The actual session/cookie clearing is
 * handled by the Supabase JS client (or by clearing the dev-bypass token in
 * stub mode).
 */
export async function signOut(): Promise<void> {
  return apiPost('/auth/sign-out', {});
}

/**
 * Return the currently authenticated user, or throw ApiError(401).
 *
 * The API returns a flat shape that satisfies `sessionUserSchema` directly,
 * plus `aiLevel`, `organizationName`, and `leaderboardOptOut`.
 */
export async function me(): Promise<
  SessionUser & {
    aiLevel: string;
    organizationName?: string;
    leaderboardOptOut: boolean;
  }
> {
  const json = (await apiGet<unknown>('/auth/me')) as Record<string, unknown>;
  const parsed = sessionUserSchema.parse(json);
  const aiLevel = typeof json['aiLevel'] === 'string' ? (json['aiLevel'] as string) : 'BEGINNER';
  const organizationName =
    typeof json['organizationName'] === 'string' ? (json['organizationName'] as string) : undefined;
  const leaderboardOptOut = json['leaderboardOptOut'] === true;
  const out: SessionUser & {
    aiLevel: string;
    organizationName?: string;
    leaderboardOptOut: boolean;
  } = {
    ...parsed,
    aiLevel,
    leaderboardOptOut,
  };
  if (organizationName !== undefined) out.organizationName = organizationName;
  return out;
}

/**
 * Accept an invitation token and create / update the User row in the invited
 * org. The web client then runs Supabase sign-up with the returned email.
 */
export interface AcceptInvitationResult {
  ok: true;
  redirect: string;
  email: string;
}

export async function acceptInvitation(
  input: AcceptInvitationInput,
): Promise<AcceptInvitationResult> {
  const parsed = acceptInvitationSchema.parse(input);
  return apiPost<AcceptInvitationInput, AcceptInvitationResult>('/auth/accept-invitation', parsed);
}
