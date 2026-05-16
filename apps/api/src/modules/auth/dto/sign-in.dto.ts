import { acceptInvitationSchema, signInRequestSchema } from '@levelup/types';
import type { AcceptInvitationInput, SignInRequest, SignInResponse } from '@levelup/types';
// Re-export the zod schemas that back this module's body validation.
// Controllers use: @Body(new ZodValidationPipe(acceptInvitationSchema))
export { acceptInvitationSchema, signInRequestSchema };
export type { AcceptInvitationInput, SignInRequest, SignInResponse };

// ---- Typed response interfaces ----

export interface SignOutResponse {
  ok: true;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  organizationId: string;
  departmentId: string | null;
  aiLevel: string;
  organizationName: string;
  leaderboardOptOut: boolean;
}

export interface AcceptInvitationResponse {
  ok: true;
  redirect: string;
  /** Email the client uses to drive the Supabase sign-in step. */
  email: string;
}

export interface DevBypassResponse {
  /** A Supabase-shaped JWT signed with the local stub secret. Stub mode only. */
  accessToken: string;
  redirectTo: string;
}
