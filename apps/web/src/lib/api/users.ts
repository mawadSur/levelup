import { apiGet, apiPatch, apiPost } from './client';
import { updateUserRoleSchema, type UpdateUserRoleInput, type ActivityEvent } from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  aiLevel: string | null;
  departmentId: string | null;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface ListUsersOptions {
  role?: string;
  departmentId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface UpdateMeInput {
  name?: string;
  jobTitle?: string;
  avatarUrl?: string;
}

export interface UpdateDeptInput {
  departmentId: string | null;
}

export interface UpdateAiLevelInput {
  aiLevel: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function listUsers(opts?: ListUsersOptions): Promise<User[]> {
  return apiGet<User[]>('/users', {
    params: opts as Record<string, string | number | boolean | undefined | null>,
  });
}

export async function getUser(id: string): Promise<User> {
  return apiGet<User>(`/users/${id}`);
}

export async function updateMe(input: UpdateMeInput): Promise<User> {
  return apiPatch<UpdateMeInput, User>('/users/me', input);
}

export interface LeaderboardOptOutInput {
  optOut: boolean;
}

export async function updateLeaderboardOptOut(input: LeaderboardOptOutInput): Promise<User> {
  return apiPatch<LeaderboardOptOutInput, User>('/users/me/leaderboard-opt-out', input);
}

export async function updateRole(input: UpdateUserRoleInput): Promise<User> {
  const parsed = updateUserRoleSchema.parse(input);
  return apiPatch<UpdateUserRoleInput, User>(`/users/${parsed.userId}/role`, parsed);
}

export async function updateUserDept(userId: string, input: UpdateDeptInput): Promise<User> {
  return apiPatch<UpdateDeptInput, User>(`/users/${userId}/department`, input);
}

export async function updateAiLevel(userId: string, input: UpdateAiLevelInput): Promise<User> {
  return apiPatch<UpdateAiLevelInput, User>(`/users/${userId}/ai-level`, input);
}

export async function deactivate(userId: string): Promise<void> {
  return apiPost(`/users/${userId}/deactivate`, {});
}

// ---------------------------------------------------------------------------
// Badge view — minimal shape to avoid pulling Prisma types client-side
// ---------------------------------------------------------------------------
export interface BadgeView {
  id: string;
  slug: string;
  label: string;
  awardedAt: string;
  description?: string;
  iconKey?: string;
  rarity?: string;
  xpReward?: number;
}

export async function getMyBadges(): Promise<BadgeView[]> {
  return apiGet<BadgeView[]>('/users/me/badges');
}

export async function getActivity(userId: string): Promise<ActivityEvent[]> {
  return apiGet<ActivityEvent[]>(`/users/${userId}/activity`);
}
