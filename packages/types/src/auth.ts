import { z } from 'zod';
import { AiLevel, Role } from '@levelup/db';

export const emailSchema = z.string().email().max(254);

export const signInSchema = z.object({
  email: emailSchema,
  redirectTo: z.string().url().optional(),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(16),
  name: z.string().min(1).max(120),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.nativeEnum(Role),
  departmentId: z.string().cuid().optional(),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().max(80).optional(),
  companySize: z.string().max(40).optional(),
  adminEmail: emailSchema,
  adminName: z.string().min(1).max(120),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const previewInvitationSchema = z.object({
  inviterName: z.string(),
  orgName: z.string(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  expiresAt: z.string(), // ISO
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']),
});
export type InvitationPreview = z.infer<typeof previewInvitationSchema>;

export const sessionUserSchema = z.object({
  id: z.string().cuid(),
  email: emailSchema,
  name: z.string(),
  role: z.nativeEnum(Role),
  // White-label tenant orgs are seeded with stable slugs ('demo-org',
  // 'kapitus', 'ceolawyer') rather than CUIDs so cross-environment data
  // (seeds, fixtures, runbooks) can reference them. Require a non-empty
  // string here instead of a CUID; the API still treats the field as the
  // authoritative tenant identifier, just without the format constraint.
  organizationId: z.string().min(1),
  departmentId: z.string().cuid().nullable(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/**
 * Full payload returned by `GET /auth/me`.
 *
 * Extends `sessionUserSchema` with the fields the API has surfaced for a
 * while but that were previously parsed defensively on the web client:
 *   - `aiLevel`         — drives `/learn` recommendations.
 *   - `organizationName` — header chrome.
 *   - `leaderboardOptOut` — settings toggle state.
 *
 * `aiLevel` is the strongly-typed `AiLevel` enum on the server. To stay
 * tolerant of older API builds that defaulted to `'BEGINNER'` as a raw string
 * (and any future levels added before clients rebuild), we accept any string
 * and let the consumer narrow when needed.
 */
export const meResponseSchema = sessionUserSchema.extend({
  aiLevel: z.string(),
  organizationName: z.string(),
  leaderboardOptOut: z.boolean(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/** Strongly-typed alias used by callers that want the enum form of aiLevel. */
export const meResponseStrictSchema = sessionUserSchema.extend({
  aiLevel: z.nativeEnum(AiLevel),
  organizationName: z.string(),
  leaderboardOptOut: z.boolean(),
});
export type MeResponseStrict = z.infer<typeof meResponseStrictSchema>;
