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
  // API mounts the singular route: POST /quizzes/:id/attempt. The plural
  // form ("/attempts") 404s on prod — that mismatch silently hid behind
  // the previous /quizzes?lessonId= 404 that prevented the quiz UI from
  // rendering at all. Now that Lane 1 lets the quiz render, this URL must
  // match too or submission will 404 mid-flow.
  const json = await apiPost<SubmitQuizAttemptInput, unknown>(
    `/quizzes/${parsed.quizId}/attempt`,
    parsed,
  );
  return quizAttemptResultSchema.parse(json);
}

export async function listMyAttempts(quizId: string): Promise<QuizAttempt[]> {
  // API mounts GET /quizzes/:id/my-attempts. Same plural-vs-singular
  // history as submitAttempt above.
  return apiGet<QuizAttempt[]>(`/quizzes/${quizId}/my-attempts`);
}
