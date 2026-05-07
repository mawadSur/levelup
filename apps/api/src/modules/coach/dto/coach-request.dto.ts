import { z } from 'zod';
import { coachRequestSchema } from '@levelup/types';

// Re-export the canonical request schema from @levelup/types so consumers
// (web client, tests, other services) stay aligned with one source of truth
// for the public coach contract.
export { coachRequestSchema };
export type { CoachRequest } from '@levelup/types';

// Body schema for POST /coach and POST /coach/stream.
//
// The CoachModule operates over a slimmer surface than the full
// `coachRequestSchema` — the controller cares about the raw user input and
// whether the resulting session should be persisted. We define the schema
// locally rather than re-using `coachRequestSchema` because the field name
// differs (`userInput` vs `inputText`) and the controller needs the
// `saveSession` flag the canonical schema does not carry.
//
// `conversationId` is OPTIONAL on the wire: when omitted the service creates
// a new Conversation and echoes its id back in the response. When provided
// the service appends new turns to that conversation (after authorising
// owner-only access).
export const coachInvokeBodySchema = z.object({
  userInput: z.string().min(1).max(8000),
  conversationId: z.string().optional(),
  saveSession: z.boolean().optional().default(true),
});

export type CoachInvokeBody = z.infer<typeof coachInvokeBodySchema>;
