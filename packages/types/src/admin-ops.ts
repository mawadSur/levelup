import { z } from 'zod';

// ---------------------------------------------------------------------------
// DLQ schemas
// ---------------------------------------------------------------------------

export const dlqRowSchema = z.object({
  id: z.string(),
  jobName: z.string(),
  jobId: z.string(),
  attempts: z.number().int(),
  failedReason: z.string(),
  data: z.unknown(),
  createdAt: z.string(),
});
export type DlqRow = z.infer<typeof dlqRowSchema>;

export const dlqListResponseSchema = z.array(dlqRowSchema);
export type DlqListResponse = z.infer<typeof dlqListResponseSchema>;

export const dlqRetryResponseSchema = z.object({
  newJobId: z.string(),
});
export type DlqRetryResponse = z.infer<typeof dlqRetryResponseSchema>;

// ---------------------------------------------------------------------------
// Audit log schemas
// ---------------------------------------------------------------------------

export const auditRowSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  actorId: z.string().nullable(),
  action: z.string(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
  actor: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullable().optional(),
});
export type AuditRow = z.infer<typeof auditRowSchema>;

export const auditPageSchema = z.object({
  rows: z.array(auditRowSchema),
  nextCursor: z.string().nullable(),
});
export type AuditPage = z.infer<typeof auditPageSchema>;

export const auditActionsResponseSchema = z.array(z.string());
export type AuditActionsResponse = z.infer<typeof auditActionsResponseSchema>;

// ---------------------------------------------------------------------------
// Query param shapes (shared between API DTO and frontend helpers)
// ---------------------------------------------------------------------------

export const dlqListParamsSchema = z.object({
  jobName: z.string().optional(),
  since: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type DlqListParams = z.infer<typeof dlqListParamsSchema>;

export const auditListParamsSchema = z.object({
  action: z.string().optional(),
  actorId: z.string().optional(),
  targetType: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});
export type AuditListParams = z.infer<typeof auditListParamsSchema>;
