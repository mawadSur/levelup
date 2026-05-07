import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { savePromptSchema, type SavePromptInput } from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface Prompt {
  id: string;
  title: string;
  promptText: string;
  category: string;
  isShared: boolean;
  /** Set when the prompt is scoped to a specific department (dept-shared). */
  departmentId: string | null;
  clonedFromId: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdatePromptInput = Partial<SavePromptInput>;

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function listPrompts(opts?: {
  category?: string;
  shared?: boolean;
  q?: string;
}): Promise<Prompt[]> {
  return apiGet<Prompt[]>('/prompts', { params: opts });
}

export async function getPrompt(id: string): Promise<Prompt> {
  return apiGet<Prompt>(`/prompts/${id}`);
}

export async function savePrompt(input: SavePromptInput): Promise<Prompt> {
  const parsed = savePromptSchema.parse(input);
  return apiPost<SavePromptInput, Prompt>('/prompts', parsed);
}

export async function updatePrompt(id: string, input: UpdatePromptInput): Promise<Prompt> {
  return apiPatch<UpdatePromptInput, Prompt>(`/prompts/${id}`, input);
}

export async function deletePrompt(id: string): Promise<void> {
  return apiDelete(`/prompts/${id}`);
}

export async function clonePrompt(id: string): Promise<Prompt> {
  return apiPost<Record<string, never>, Prompt>(`/prompts/${id}/clone`, {});
}

export async function sharePrompt(id: string, shared: boolean): Promise<Prompt> {
  return apiPatch<{ isShared: boolean }, Prompt>(`/prompts/${id}`, {
    isShared: shared,
  });
}
