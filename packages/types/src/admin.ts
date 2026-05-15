import { z } from 'zod';
import { AiLevel, Role } from '@levelup/db';

/**
 * Approved-tool entry. `tier` follows the standard governance buckets:
 *   - `approved` — vetted tools cleared for use.
 *   - `caution`  — allowed under review; requires extra care.
 *   - `banned`   — explicitly disallowed for company data.
 */
export const approvedToolEntrySchema = z.object({
  name: z.string().min(1).max(80),
  tier: z.enum(['approved', 'caution', 'banned']),
  notes: z.string().max(500).optional(),
});
export type ApprovedToolEntry = z.infer<typeof approvedToolEntrySchema>;

export const updatePolicySchema = z.object({
  policyText: z.string().min(20).max(100_000),
  approvedTools: z.array(approvedToolEntrySchema).max(200),
  uploadedFileUrl: z.string().url().optional(),
});
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;

export const reportFiltersSchema = z.object({
  departmentId: z.string().cuid().optional(),
  role: z.nativeEnum(Role).optional(),
  level: z.nativeEnum(AiLevel).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

export const updateUserRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.nativeEnum(Role),
  departmentId: z.string().cuid().nullable().optional(),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(80),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

// ---------------------------------------------------------------------------
// GET /organizations/me/stats — admin dashboard payload.
//
// `byRole` and `byDepartment` carry both user count AND completion rate per
// group so the dashboard renders without falling back to the heavier
// CompletionReport endpoint. completionRate is a 0..1 ratio (multiply by 100
// for percent display) and follows the org-wide formula:
//     completed UserProgress rows / total UserProgress rows
// restricted to users in the group.
// ---------------------------------------------------------------------------

export const orgStatsRoleEntrySchema = z.object({
  count: z.number().int().min(0),
  completionRate: z.number().min(0).max(1),
});
export type OrgStatsRoleEntry = z.infer<typeof orgStatsRoleEntrySchema>;

export const orgStatsDepartmentEntrySchema = z.object({
  departmentId: z.string().cuid(),
  name: z.string(),
  count: z.number().int().min(0),
  completionRate: z.number().min(0).max(1),
});
export type OrgStatsDepartmentEntry = z.infer<typeof orgStatsDepartmentEntrySchema>;

export const orgStatsSchema = z.object({
  totalUsers: z.number().int().min(0),
  activeUsers: z.number().int().min(0),
  /** 0..1 ratio. Multiply by 100 for percent display. */
  completionRate: z.number().min(0).max(1),
  byRole: z.object({
    ADMIN: orgStatsRoleEntrySchema,
    MANAGER: orgStatsRoleEntrySchema,
    EMPLOYEE: orgStatsRoleEntrySchema,
  }),
  byDepartment: z.array(orgStatsDepartmentEntrySchema),
  riskFlags: z.number().int().min(0),
});
export type OrgStats = z.infer<typeof orgStatsSchema>;
