import { z } from 'zod';

/**
 * Query params for completion report endpoints.
 * Uses coerce for dates so Express string query params are automatically
 * converted to Date objects.
 */
export const completionFiltersSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  departmentId: z.string().cuid().optional(),
  pathId: z.string().cuid().optional(),
});

export type CompletionFiltersDto = z.infer<typeof completionFiltersSchema>;

export const aggregateJobSchema = z.object({
  departmentId: z.string().cuid().optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export type AggregateJobDto = z.infer<typeof aggregateJobSchema>;
