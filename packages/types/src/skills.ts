import { z } from 'zod';

export const skillTierSchema = z.enum(['BEGINNER', 'PRACTITIONER', 'POWER_USER', 'CHAMPION']);
export type SkillTier = z.infer<typeof skillTierSchema>;

export const createSkillSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  tier: skillTierSchema,
  prerequisites: z.array(z.string().min(1)).max(20).default([]),
});
export type CreateSkillInput = z.infer<typeof createSkillSchema>;

export interface SkillSummary {
  id: string;
  organizationId: string | null;
  slug: string;
  name: string;
  description: string | null;
  tier: SkillTier;
  prerequisites: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSkillRow {
  skillId: string;
  slug: string;
  name: string;
  tier: SkillTier;
  exposure: number;
  practice: number;
  transfer: number;
  composite: number;
  updatedAt: string;
}

export interface TeamSkillCell {
  userId: string;
  userName: string;
  email: string;
  departmentId: string | null;
  departmentName: string | null;
  skillId: string;
  skillSlug: string;
  skillName: string;
  tier: SkillTier;
  exposure: number;
  practice: number;
  transfer: number;
  composite: number;
}

export interface TeamSkillHeatmap {
  users: Array<{
    userId: string;
    userName: string;
    email: string;
    departmentId: string | null;
    departmentName: string | null;
  }>;
  skills: Array<{
    skillId: string;
    slug: string;
    name: string;
    tier: SkillTier;
  }>;
  cells: TeamSkillCell[];
}
