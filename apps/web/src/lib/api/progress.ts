import { apiGet, apiPost } from './client';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface LessonProgress {
  lessonId: string;
  status: string;
  score: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface PathProgress {
  learningPathId: string;
  completionRate: number;
  completedLessons: number;
  totalLessons: number;
  lastActivityAt: string | null;
}

export interface UserProgress {
  userId: string;
  name: string;
  email: string;
  paths: PathProgress[];
  overallCompletionRate: number;
}

/**
 * Per-assigned-path summary returned by GET /progress/me.
 *
 * The previous shape was a flat lesson list which forced consumers to
 * recompute per-path aggregates client-side. The new shape mirrors what
 * the dashboards actually render.
 */
export interface MyPathProgress {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  /** 0–100 integer percentage. */
  percentComplete: number;
  /** ISO timestamp; falls back to assignedAt when no lesson activity yet. */
  lastActivityAt: string;
  currentLessonId: string | null;
  assignedAt: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getMyProgress(): Promise<MyPathProgress[]> {
  return apiGet<MyPathProgress[]>('/progress/me');
}

export async function getMyPathProgress(learningPathId: string): Promise<PathProgress> {
  return apiGet<PathProgress>(`/progress/me/paths/${learningPathId}`);
}

export async function startLesson(lessonId: string): Promise<LessonProgress> {
  return apiPost<Record<string, never>, LessonProgress>(`/progress/lessons/${lessonId}/start`, {});
}

export async function completeLesson(lessonId: string, _score?: number): Promise<LessonProgress> {
  return apiPost<Record<string, never>, LessonProgress>(
    `/progress/lessons/${lessonId}/complete`,
    {},
  );
}

export async function getUserProgress(userId: string): Promise<UserProgress> {
  return apiGet<UserProgress>(`/progress/users/${userId}`);
}

// ---------------------------------------------------------------------------
// Bulk team progress
// ---------------------------------------------------------------------------

/**
 * Server-side aggregate the team page renders. One row per requested userId.
 * `completionRate` is normalised to 0..1 (not a percentage) so callers can
 * format it consistently.
 */
export interface TeamProgressEntry {
  userId: string;
  assignedPaths: number;
  completedLessons: number;
  totalLessons: number;
  completionRate: number;
  lastActiveAt: string | null;
}

/**
 * Fetch progress for an entire team in one round trip. Replaces the previous
 * per-user N+1 pattern. POST is used because the userIds list can exceed
 * URL-length limits for large teams.
 */
export async function getTeamProgress(userIds: string[]): Promise<TeamProgressEntry[]> {
  if (userIds.length === 0) return [];
  return apiPost<{ userIds: string[] }, TeamProgressEntry[]>('/progress/team', { userIds });
}
