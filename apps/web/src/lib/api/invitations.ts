import { apiGet, apiPost, apiDelete } from './client';
import { inviteUserSchema, type InviteUserInput, type InvitationPreview } from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface Invitation {
  id: string;
  email: string;
  role: string;
  departmentId: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function createInvite(input: InviteUserInput): Promise<Invitation> {
  const parsed = inviteUserSchema.parse(input);
  return apiPost<InviteUserInput, Invitation>('/invitations', parsed);
}

export async function listInvites(opts?: { status?: string }): Promise<Invitation[]> {
  return apiGet<Invitation[]>('/invitations', { params: opts });
}

export async function resendInvite(id: string): Promise<{ sent: true }> {
  return apiPost<Record<string, never>, { sent: true }>(`/invitations/${id}/resend`, {});
}

export async function revokeInvite(id: string): Promise<void> {
  return apiDelete(`/invitations/${id}`);
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  return apiGet<InvitationPreview>(`/invitations/preview/${encodeURIComponent(token)}`);
}
