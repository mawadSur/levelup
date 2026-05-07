import { z } from 'zod';

export const topPromptsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'all']).default('month'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type TopPromptsQueryDto = z.infer<typeof topPromptsQuerySchema>;

export const usageTrendQuerySchema = z.object({
  period: z.enum(['30', '90', '365']).default('30'),
  interval: z.enum(['day', 'week']).default('day'),
});

export type UsageTrendQueryDto = z.infer<typeof usageTrendQuerySchema>;

export const categoryMixQuerySchema = z.object({
  period: z.enum(['week', 'month', 'all']).default('month'),
});

export type CategoryMixQueryDto = z.infer<typeof categoryMixQuerySchema>;
