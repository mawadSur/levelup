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
