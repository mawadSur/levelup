import { z } from 'zod';

export const triggerFeedQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});
export type TriggerFeedQueryDto = z.infer<typeof triggerFeedQuerySchema>;

export const generateReportSchema = z.object({
  /** Optional human label e.g. "Q2 2026". The worker will fall back to the period dates. */
  periodLabel: z.string().min(1).max(80).optional(),
  /** Number of days to look back. Defaults to 90 — the marketing & sales narrative. */
  windowDays: z.coerce.number().int().positive().max(365).default(90),
});
export type GenerateReportDto = z.infer<typeof generateReportSchema>;
