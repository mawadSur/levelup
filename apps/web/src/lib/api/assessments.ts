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
  text: string;
  choices: string[];
}

export interface Assessment {
  id: string;
  type: string;
  items: AssessmentItem[];
}

export interface MyAssessment {
  id: string;
  type: string;
  score: number;
  recommendedLevel: string;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function startAssessment(type: string): Promise<Assessment> {
  return apiPost<{ type: string }, Assessment>('/assessments/start', { type });
}

export async function submitAssessment(input: SubmitAssessmentInput): Promise<AssessmentResult> {
  const parsed = submitAssessmentSchema.parse(input);
  const json = await apiPost<SubmitAssessmentInput, unknown>('/assessments/submit', parsed);
  return assessmentResultSchema.parse(json);
}

export async function listMyAssessments(): Promise<MyAssessment[]> {
  return apiGet<MyAssessment[]>('/assessments/me');
}
