import { z } from 'zod';

// ---------------------------------------------------------------------------
// Data Export
// ---------------------------------------------------------------------------

export const dataExportStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'READY',
  'EXPIRED',
  'FAILED',
]);
export type DataExportStatusType = z.infer<typeof dataExportStatusSchema>;

export const dataExportRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: dataExportStatusSchema,
  fileUrl: z.string().nullable(),
  fileSizeBytes: z.number().int().nullable(),
  expiresAt: z.string().nullable(),
  failedReason: z.string().nullable(),
  requestedAt: z.string(),
  readyAt: z.string().nullable(),
});
export type DataExportRequestDto = z.infer<typeof dataExportRequestSchema>;

// ---------------------------------------------------------------------------
// Deletion Request
// ---------------------------------------------------------------------------

export const deletionRequestStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
]);
export type DeletionRequestStatusType = z.infer<typeof deletionRequestStatusSchema>;

export const deletionRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: deletionRequestStatusSchema,
  scheduledFor: z.string(),
  reason: z.string().nullable(),
  requestedAt: z.string(),
  confirmedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type DeletionRequestDto = z.infer<typeof deletionRequestSchema>;

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const requestDeletionSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type RequestDeletionInput = z.infer<typeof requestDeletionSchema>;
