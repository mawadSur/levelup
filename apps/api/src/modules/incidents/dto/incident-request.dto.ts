import { z } from 'zod';
import { IncidentSeverity, IncidentStatus } from '@levelup/db';

const severityValues = Object.values(IncidentSeverity) as [IncidentSeverity, ...IncidentSeverity[]];
const statusValues = Object.values(IncidentStatus) as [IncidentStatus, ...IncidentStatus[]];

export const incidentDismissSchema = z.object({
  reason: z.string().trim().min(1, 'Dismiss reason is required').max(1000),
});
export type IncidentDismissRequest = z.infer<typeof incidentDismissSchema>;

// Severity/status accept either a single value, a repeated array, or a CSV
// string ("OPEN,ACKNOWLEDGED"). The web client sends CSV for compactness so we
// pre-split the string before the enum check.
const severitySchema = z
  .union([z.string(), z.array(z.enum(severityValues))])
  .optional()
  .transform((v): IncidentSeverity[] | undefined => {
    if (v === undefined) return undefined;
    const arr = Array.isArray(v)
      ? v
      : v
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
    return arr as IncidentSeverity[];
  })
  .pipe(z.array(z.enum(severityValues)).optional());

const statusSchema = z
  .union([z.string(), z.array(z.enum(statusValues))])
  .optional()
  .transform((v): IncidentStatus[] | undefined => {
    if (v === undefined) return undefined;
    const arr = Array.isArray(v)
      ? v
      : v
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
    return arr as IncidentStatus[];
  })
  .pipe(z.array(z.enum(statusValues)).optional());

export const incidentListQuerySchema = z.object({
  severity: severitySchema,
  status: statusSchema,
  includeResolvedSinceDays: z.coerce.number().int().positive().max(365).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type IncidentListQuery = z.infer<typeof incidentListQuerySchema>;
