/**
 * Typed job catalog for LevelUp AI Academy.
 *
 * `JobMap` is the single source of truth for job name → input/output types.
 * It is imported by both producers (queues.ts) and consumers (worker.ts) so that
 * they can never drift out of sync.
 */

// ---------------------------------------------------------------------------
// Job input / output shapes
// ---------------------------------------------------------------------------

export interface CertPdfInput {
  certificateId: string;
}
export interface CertPdfOutput {
  pdfUrl: string;
}

export interface ReportAggregateInput {
  organizationId: string;
  departmentId?: string;
  periodStart: string;
  periodEnd: string;
}
export interface ReportAggregateOutput {
  reportId: string;
}

export interface EmbedContentInput {
  lessonId: string;
}
export interface EmbedContentOutput {
  embedded: true;
}

export interface SendEmailInput {
  to: string;
  templateKey:
    | 'invitation'
    | 'certificate'
    | 'welcome'
    | 'manager-digest'
    | 'account-deletion-confirmation'
    | 'risk-alert-email';
  data: Record<string, unknown>;
}
export interface SendEmailOutput {
  messageId: string;
}

export interface DataExportInput {
  requestId: string;
  userId: string;
}
export interface DataExportOutput {
  fileUrl: string;
  sizeBytes: number;
}

export interface AuditCleanupInput {
  /** ISO timestamp; rows older than this are deleted. Defaults to 13 months ago. */
  olderThan?: string;
}
export interface AuditCleanupOutput {
  deleted: number;
}

export interface ManagerDigestCronInput {
  triggeredAt?: string;
}
export interface ManagerDigestCronOutput {
  managersNotified: number;
}

export interface PathGenerationInput {
  /** PathGenerationRequest.id — handler loads the row to read prompt/audience. */
  requestId: string;
}
export interface PathGenerationOutput {
  status: 'READY' | 'FAILED';
  generatedPathId?: string;
}

export interface AnomalyScanInput {
  /** ISO timestamp injected by the cron scheduler — useful for logging/idempotency. */
  triggeredAt?: string;
}
export interface AnomalyScanOutput {
  orgsScanned: number;
  alertsCreated: number;
}

// ---------------------------------------------------------------------------
// Discriminated union map  name → { input, output }
// ---------------------------------------------------------------------------

export interface JobMap {
  'cert-pdf': { input: CertPdfInput; output: CertPdfOutput };
  'report-aggregate': {
    input: ReportAggregateInput;
    output: ReportAggregateOutput;
  };
  'embed-content': { input: EmbedContentInput; output: EmbedContentOutput };
  'send-email': { input: SendEmailInput; output: SendEmailOutput };
  'data-export': { input: DataExportInput; output: DataExportOutput };
  'audit-cleanup': { input: AuditCleanupInput; output: AuditCleanupOutput };
  'manager-digest-cron': { input: ManagerDigestCronInput; output: ManagerDigestCronOutput };
  'path-generation': { input: PathGenerationInput; output: PathGenerationOutput };
  'anomaly-scan': { input: AnomalyScanInput; output: AnomalyScanOutput };
}

/** Union of all valid job names. */
export type JobName = keyof JobMap;
