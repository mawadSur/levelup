import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import {
  assignLearningPathSchema,
  createLearningPathSchema,
  type AssignLearningPathInput,
  type CreateLearningPathInput,
} from '@levelup/types';

// ---------------------------------------------------------------------------
// Bulk-save types (mirrors apps/api save-bulk.dto.ts — kept in sync)
// ---------------------------------------------------------------------------

export interface BulkQuizQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation?: string | null;
  orderIndex: number;
}

export interface BulkQuiz {
  id?: string;
  title: string;
  questions: BulkQuizQuestion[];
}

export interface BulkLesson {
  id?: string;
  slug: string;
  title: string;
  body: string;
  estimatedMinutes: number;
  orderIndex: number;
  quiz?: BulkQuiz;
}

export interface SaveBulkInput {
  title?: string;
  description?: string | null;
  targetRole?: string | null;
  targetLevel?: string;
  isPublished?: boolean;
  lessons: BulkLesson[];
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface LearningPath {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  targetRole: string | null;
  targetLevel: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  lessonCount: number;
  estimatedMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type UpdateLearningPathInput = Partial<CreateLearningPathInput>;

export interface PathLearner {
  userId: string;
  name: string;
  email: string;
  completionRate: number;
  assignedAt: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function listPaths(opts?: {
  published?: boolean;
  targetRole?: string;
}): Promise<LearningPath[]> {
  return apiGet<LearningPath[]>('/learning-paths', { params: opts });
}

export async function getPath(idOrSlug: string): Promise<LearningPath> {
  return apiGet<LearningPath>(`/learning-paths/${idOrSlug}`);
}

export async function createPath(input: CreateLearningPathInput): Promise<LearningPath> {
  const parsed = createLearningPathSchema.parse(input);
  return apiPost<CreateLearningPathInput, LearningPath>('/learning-paths', parsed);
}

export async function updatePath(
  id: string,
  input: UpdateLearningPathInput,
): Promise<LearningPath> {
  return apiPatch<UpdateLearningPathInput, LearningPath>(`/learning-paths/${id}`, input);
}

export async function deletePath(id: string): Promise<void> {
  return apiDelete(`/learning-paths/${id}`);
}

export async function assignPath(input: AssignLearningPathInput): Promise<{ assigned: number }> {
  const parsed = assignLearningPathSchema.parse(input);
  return apiPost<AssignLearningPathInput, { assigned: number }>(
    `/learning-paths/${parsed.learningPathId}/assign`,
    parsed,
  );
}

export async function unassignPath(opts: {
  learningPathId: string;
  userId: string;
}): Promise<void> {
  return apiDelete(`/learning-paths/${opts.learningPathId}/assign/${opts.userId}`);
}

export async function getLearners(learningPathId: string): Promise<PathLearner[]> {
  return apiGet<PathLearner[]>(`/learning-paths/${learningPathId}/learners`);
}

export async function saveBulk(pathId: string, input: SaveBulkInput): Promise<LearningPath> {
  return apiPost<SaveBulkInput, LearningPath>(`/paths/${pathId}/save-bulk`, input);
}
