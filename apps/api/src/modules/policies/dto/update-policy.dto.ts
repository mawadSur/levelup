import type { z } from 'zod';
import { updatePolicySchema, type ApprovedToolEntry } from '@levelup/types';

/**
 * Body schema for POST /policies.
 *
 * Aligns with `@levelup/types::updatePolicySchema` so the API and web client
 * speak the same contract.  `approvedTools` is a flat `Array<{ name, tier,
 * notes? }>` where tier ∈ {approved, caution, banned}.
 *
 * `uploadedFileUrl` remains optional. Agent C (storage migration) will add a
 * companion `fileStoragePath` field; until then the URL form is preserved.
 */
export const publishPolicySchema = updatePolicySchema;
export type PublishPolicyDto = z.infer<typeof publishPolicySchema>;

export type ApprovedTools = ApprovedToolEntry[];
