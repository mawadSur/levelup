import { apiGet, apiPost } from './client';
import {
  submitQuizAttemptSchema,
  quizAttemptResultSchema,
  type SubmitQuizAttemptInput,
  type QuizAttemptResult,
} from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface QuizQuestion {
  id: string;
  text: string;
  choices: string[];
  /** Not included in GET — sent back only in attempt result */
  correctIndex?: number;
}

/** Quiz question shape returned by the admin-facing lesson quiz endpoint. */
export interface AdminQuizQuestion {
  id: string;
  quizId: string;
  prompt: string;
  choices: unknown;
  correctIndex?: number;
  explanation: string | null;
  orderIndex: number;
}

export interface AdminQuizSummary {
  id: string;
  lessonId: string;
  title: string;
  questions: AdminQuizQuestion[];
}

export interface Quiz {
  id: string;
  lessonId: string;
  questions: QuizQuestion[];
  passingScore: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  score: number;
  passed: boolean;
  attemptedAt: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getQuiz(quizId: string): Promise<Quiz> {
  return apiGet<Quiz>(`/quizzes/${quizId}`);
}

/** List quizzes for a lesson (used by the admin path editor). */
export async function listQuizzes(lessonId: string): Promise<AdminQuizSummary[]> {
  return apiGet<AdminQuizSummary[]>(`/lessons/${lessonId}/quizzes`);
}

/**
 * Fetch a quiz including correctIndex and explanation fields (admin-only use).
 * Uses the same GET /quizzes/:id endpoint — the server strips correctIndex for
 * learners, but the admin editor sends it back via save-bulk so we still need
 * a best-guess. Falls back to 0 for missing correctIndex.
 */
export async function getQuizWithAnswers(quizId: string): Promise<AdminQuizSummary | null> {
  try {
    return await apiGet<AdminQuizSummary>(`/quizzes/${quizId}`);
  } catch {
    return null;
  }
}

export async function submitAttempt(input: SubmitQuizAttemptInput): Promise<QuizAttemptResult> {
  const parsed = submitQuizAttemptSchema.parse(input);
  const json = await apiPost<SubmitQuizAttemptInput, unknown>(
    `/quizzes/${parsed.quizId}/attempts`,
    parsed,
  );
  return quizAttemptResultSchema.parse(json);
}

export async function listMyAttempts(quizId: string): Promise<QuizAttempt[]> {
  return apiGet<QuizAttempt[]>(`/quizzes/${quizId}/attempts/me`);
}
