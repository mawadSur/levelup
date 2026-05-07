import { z } from 'zod';

export const upsertFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9\-_:.]+$/i, 'flag keys must be alphanumeric/dash/dot/colon/underscore'),
  enabled: z.boolean(),
  rolloutPercent: z.number().int().min(0).max(100).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const evaluatedFlagSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  rolloutPercent: z.number().int().nullable(),
  source: z.enum(['org', 'global', 'default']),
  metadata: z.record(z.unknown()).nullable(),
});

export type UpsertFlagInput = z.infer<typeof upsertFlagSchema>;
export type EvaluatedFlag = z.infer<typeof evaluatedFlagSchema>;
