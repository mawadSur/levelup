import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

export const demoResetSchema = z.object({
  companyName: z.string().min(2).max(60),
  industry: z.string().max(40).optional(),
  seedSize: z.enum(['small', 'medium', 'large']).default('medium'),
});

export type DemoResetInput = z.infer<typeof demoResetSchema>;

// ---------------------------------------------------------------------------
// Response schema
// ---------------------------------------------------------------------------

export const demoResetResponseSchema = z.object({
  ok: z.boolean(),
  companyName: z.string(),
  seedSize: z.enum(['small', 'medium', 'large']),
  usersCreated: z.number().int(),
  lessonsCompleted: z.number().int(),
  durationMs: z.number().int(),
});

export type DemoResetResponse = z.infer<typeof demoResetResponseSchema>;
