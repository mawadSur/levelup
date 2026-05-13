import { apiGet } from './client';

export type CurriculumTierKey = 'BEGINNER' | 'PRACTITIONER' | 'POWER_USER' | 'CHAMPION';
export type CurriculumLessonKind = 'READ' | 'SCENARIO' | 'LAB';
export type CurriculumLessonStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface CurriculumLessonNode {
  id: string;
  slug: string;
  title: string;
  kind: CurriculumLessonKind;
  orderIndex: number;
  estimatedMinutes: number;
  status: CurriculumLessonStatus;
}

export interface CurriculumPathNode {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tier: CurriculumTierKey;
  isCore: boolean;
  prerequisiteSlugs: string[];
  blockingPrereqs: string[];
  isUnlocked: boolean;
  isComplete: boolean;
  progress: { completed: number; total: number };
  lessons: CurriculumLessonNode[];
}

export interface CurriculumTierNode {
  tier: CurriculumTierKey;
  label: string;
  tagline: string;
  paths: CurriculumPathNode[];
}

export interface CurriculumGameState {
  level: number;
  xp: number;
  xpAtCurrentLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
}

export interface CurriculumMe {
  tiers: CurriculumTierNode[];
  gameState: CurriculumGameState;
  meta: { prereqTitles: Record<string, string> };
}

export async function getMyCurriculum(): Promise<CurriculumMe> {
  return apiGet<CurriculumMe>('/curriculum/me');
}
