import { apiGet, apiPost } from './client';
import type {
  CreateSkillInput,
  SkillSummary,
  TeamSkillHeatmap,
  UserSkillRow,
} from '@levelup/types';

export async function listSkills(): Promise<SkillSummary[]> {
  return apiGet<SkillSummary[]>('/skills');
}

export async function listMySkills(): Promise<UserSkillRow[]> {
  return apiGet<UserSkillRow[]>('/skills/me');
}

export async function getTeamHeatmap(opts?: { limit?: number }): Promise<TeamSkillHeatmap> {
  return apiGet<TeamSkillHeatmap>('/admin/skills/team', { params: opts });
}

export async function createSkill(input: CreateSkillInput): Promise<SkillSummary> {
  return apiPost<CreateSkillInput, SkillSummary>('/admin/skills', input);
}

export type { SkillSummary, UserSkillRow, TeamSkillHeatmap, CreateSkillInput };
