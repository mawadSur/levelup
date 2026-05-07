import { z } from 'zod';

export const searchHitSchema = z.object({
  type: z.enum(['lesson', 'prompt']),
  id: z.string(),
  title: z.string(),
  slug: z.string().optional(),
  snippet: z.string(),
  pathSlug: z.string().optional(),
  pathTitle: z.string().optional(),
  score: z.number(),
});

export const searchResponseSchema = z.object({
  hits: z.array(searchHitSchema),
  query: z.string(),
  stub: z.boolean().optional(),
});

export type SearchHit = z.infer<typeof searchHitSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
