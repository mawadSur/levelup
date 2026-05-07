import { z } from 'zod';

/**
 * Public summary of an installed third-party integration.
 *
 * The API masks the encrypted token columns before returning these to the
 * web client — they MUST NOT be exposed.
 */
export const integrationSummarySchema = z.object({
  id: z.string(),
  provider: z.enum(['SLACK', 'MS_TEAMS']),
  status: z.enum(['ACTIVE', 'REVOKED', 'ERROR']),
  externalTeamId: z.string(),
  externalTeamName: z.string().nullable(),
  installedAt: z.string(),
  installedByName: z.string().nullable(),
  scopes: z.array(z.string()),
});
export type IntegrationSummary = z.infer<typeof integrationSummarySchema>;

export const integrationProviderSchema = z.enum(['SLACK', 'MS_TEAMS']);
export type IntegrationProviderInput = z.infer<typeof integrationProviderSchema>;
