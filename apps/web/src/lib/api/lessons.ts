import { apiGet, apiPut, apiDelete, apiPost } from './client';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface Lesson {
  id: string;
  learningPathId: string;
  title: string;
  slug: string;
  body?: string;
  /** @deprecated Server returns `body`; this remains for older callers. */
  content?: string | null;
  videoUrl: string | null;
  estimatedMinutes: number;
  /** orderIndex from the API. Aliased here for legacy callers. */
  orderIndex?: number;
  /** @deprecated use orderIndex */
  order?: number;
  /** Quiz id when the lesson has a quiz, otherwise null. */
  quizId: string | null;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertLessonInput {
  title: string;
  slug: string;
  content?: string;
  videoUrl?: string;
  estimatedMinutes?: number;
  order?: number;
  isPublished?: boolean;
}

export interface ReorderLessonsInput {
  /** Ordered array of lesson IDs */
  lessonIds: string[];
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function listLessons(learningPathId: string): Promise<Lesson[]> {
  return apiGet<Lesson[]>(`/learning-paths/${learningPathId}/lessons`);
}

export async function getLesson(learningPathId: string, lessonId: string): Promise<Lesson> {
  return apiGet<Lesson>(`/learning-paths/${learningPathId}/lessons/${lessonId}`);
}

export async function upsertLesson(
  learningPathId: string,
  lessonId: string | undefined,
  input: UpsertLessonInput,
): Promise<Lesson> {
  if (lessonId) {
    // update
    return apiPut<UpsertLessonInput, Lesson>(
      `/learning-paths/${learningPathId}/lessons/${lessonId}`,
      input,
    );
  }
  // create
  return apiPost<UpsertLessonInput, Lesson>(`/learning-paths/${learningPathId}/lessons`, input);
}

export async function deleteLesson(learningPathId: string, lessonId: string): Promise<void> {
  return apiDelete(`/learning-paths/${learningPathId}/lessons/${lessonId}`);
}

export async function reorderLessons(
  learningPathId: string,
  input: ReorderLessonsInput,
): Promise<void> {
  return apiPost(`/learning-paths/${learningPathId}/lessons/reorder`, input);
}
