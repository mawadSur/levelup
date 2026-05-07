import { z } from 'zod';
import type { AnomalySeverity, AnomalyKind } from '@levelup/db';

// ---------------------------------------------------------------------------
// Per-kind signal shapes — tagged union pattern.
// ---------------------------------------------------------------------------

export const coachUsageSpikeSignalSchema = z.object({
  kind: z.literal('COACH_USAGE_SPIKE'),
  today: z.number().int().min(0),
  priorAvg: z.number().min(0),
  ratio: z.number().min(0),
});
export type CoachUsageSpikeSignal = z.infer<typeof coachUsageSpikeSignalSchema>;

export const sensitiveDataBurstSignalSchema = z.object({
  kind: z.literal('SENSITIVE_DATA_BURST'),
  count24h: z.number().int().min(0),
  categories: z.array(z.string()),
});
export type SensitiveDataBurstSignal = z.infer<typeof sensitiveDataBurstSignalSchema>;

export const streakBrokenAtRiskSignalSchema = z.object({
  kind: z.literal('STREAK_BROKEN_AT_RISK'),
  currentStreak: z.number().int().min(0),
  hoursUntilBreak: z.number().min(0),
});
export type StreakBrokenAtRiskSignal = z.infer<typeof streakBrokenAtRiskSignalSchema>;

export const pathBuilderAbuseSignalSchema = z.object({
  kind: z.literal('PATH_BUILDER_ABUSE'),
  count24h: z.number().int().min(0),
});
export type PathBuilderAbuseSignal = z.infer<typeof pathBuilderAbuseSignalSchema>;

export const promptCloningAbuseSignalSchema = z.object({
  kind: z.literal('PROMPT_CLONING_ABUSE'),
  count24h: z.number().int().min(0),
});
export type PromptCloningAbuseSignal = z.infer<typeof promptCloningAbuseSignalSchema>;

export const anomalySignalSchema = z.discriminatedUnion('kind', [
  coachUsageSpikeSignalSchema,
  sensitiveDataBurstSignalSchema,
  streakBrokenAtRiskSignalSchema,
  pathBuilderAbuseSignalSchema,
  promptCloningAbuseSignalSchema,
]);
export type AnomalySignal = z.infer<typeof anomalySignalSchema>;

// ---------------------------------------------------------------------------
// AnomalyAlert DTO (returned by the API)
// ---------------------------------------------------------------------------

export const anomalySeverityValues = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type AnomalySeverityValue = (typeof anomalySeverityValues)[number];

export const anomalyKindValues = [
  'COACH_USAGE_SPIKE',
  'SENSITIVE_DATA_BURST',
  'STREAK_BROKEN_AT_RISK',
  'PATH_BUILDER_ABUSE',
  'PROMPT_CLONING_ABUSE',
] as const;
export type AnomalyKindValue = (typeof anomalyKindValues)[number];

// Sanity-check: keep in sync with @levelup/db enums
const _severityCheck: AnomalySeverityValue = 'LOW' satisfies AnomalySeverity;
void _severityCheck;
const _kindCheck: AnomalyKindValue = 'COACH_USAGE_SPIKE' satisfies AnomalyKind;
void _kindCheck;

export const anomalyAlertSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string().nullable(),
  kind: z.enum(anomalyKindValues),
  severity: z.enum(anomalySeverityValues),
  signal: z.record(z.unknown()),
  acknowledgedAt: z.string().nullable(),
  acknowledgedBy: z.string().nullable(),
  createdAt: z.string(),
  /** Populated by the API when fetching with user details. */
  userName: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
});
export type AnomalyAlertDto = z.infer<typeof anomalyAlertSchema>;

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

export const listAnomaliesQuerySchema = z.object({
  severity: z.enum(anomalySeverityValues).optional(),
  kind: z.enum(anomalyKindValues).optional(),
  since: z.string().optional(),
  unacknowledged: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListAnomaliesQuery = z.infer<typeof listAnomaliesQuerySchema>;

// ---------------------------------------------------------------------------
// List response
// ---------------------------------------------------------------------------

export const listAnomaliesResponseSchema = z.object({
  items: z.array(anomalyAlertSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int(),
});
export type ListAnomaliesResponse = z.infer<typeof listAnomaliesResponseSchema>;
