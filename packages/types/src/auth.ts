import { z } from 'zod';
import { Role } from '@levelup/db';

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
  organizationId: z.string().cuid(),
  departmentId: z.string().cuid().nullable(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
