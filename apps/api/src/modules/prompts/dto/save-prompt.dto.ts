import { savePromptSchema } from '@levelup/types';

// Re-export the canonical schema and its inferred type.
// ZodValidationPipe is constructed with the schema directly; downstream code
// uses the DTO type for typed parameters.
export { savePromptSchema };
export type SavePromptDto = {
  title: string;
  promptText: string;
  category: string;
  isShared: boolean;
  /** Optional department scope. If set alongside isShared, creates a dept-shared prompt. */
  departmentId?: string | null;
};
