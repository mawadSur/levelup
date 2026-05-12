import { apiGet, apiPost } from './client';
import {
  submitAssessmentSchema,
  assessmentResultSchema,
  type SubmitAssessmentInput,
  type AssessmentResult,
} from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface AssessmentItem {
  id: string;
  /** Question text. Matches the API field name (`prompt`). */
  prompt: string;
  choices: string[];
  level?: string;
  category?: string;
}

/** Shape returned by POST /assessments/start. */
interface StartAssessmentResponse {
  assessmentSessionId: string;
  items: AssessmentItem[];
}

export interface Assessment {
  /**
   * Server-issued session fingerprint. Must be passed back on submit so the
   * server can verify the item set wasn't tampered with.
   */
  assessmentSessionId: string;
  /**
   * Alias of `assessmentSessionId` for code that persists runs under an `id`
   * key (localStorage, in-flight components).
   */
  id: string;
  type: string;
  items: AssessmentItem[];
}

export interface MyAssessment {
  id: string;
  type: string;
  score: number;
  recommendedLevel: string;
  /** Server may return either field name depending on deploy generation —
   * the rename `createdAt → completedAt` shipped in 00b7ae2 but older API
   * builds still emit `createdAt`. Callers read both. */
  completedAt?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function startAssessment(type: string): Promise<Assessment> {
  const response = await apiPost<{ type: string }, StartAssessmentResponse>('/assessments/start', {
    type,
  });
  return {
    assessmentSessionId: response.assessmentSessionId,
    id: response.assessmentSessionId,
    type,
    items: response.items,
  };
}

export async function submitAssessment(input: SubmitAssessmentInput): Promise<AssessmentResult> {
  const parsed = submitAssessmentSchema.parse(input);
  const json = await apiPost<SubmitAssessmentInput, unknown>('/assessments/submit', parsed);
  return assessmentResultSchema.parse(json);
}

export async function listMyAssessments(): Promise<MyAssessment[]> {
  return apiGet<MyAssessment[]>('/assessments/me');
}
