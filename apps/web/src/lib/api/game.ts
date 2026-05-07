import { apiGet, apiPost } from './client';
import type { GameState, DailyQuests, Leaderboard } from '@levelup/types';

export async function getGameState(): Promise<GameState> {
  return apiGet<GameState>('/game/state');
}

export async function getTodayQuests(): Promise<DailyQuests> {
  return apiGet<DailyQuests>('/game/quests/today');
}

export async function claimQuest(slug: string): Promise<{ awarded: number }> {
  return apiPost<{ slug: string }, { awarded: number }>('/game/quests/claim', { slug });
}

export interface LeaderboardOptions {
  scope?: 'org' | 'department' | 'me';
  period?: 'week' | 'month' | 'all';
  departmentId?: string;
}

export async function getLeaderboard(opts: LeaderboardOptions = {}): Promise<Leaderboard> {
  const params = new URLSearchParams();
  if (opts.scope) params.set('scope', opts.scope);
  if (opts.period) params.set('period', opts.period);
  if (opts.departmentId) params.set('departmentId', opts.departmentId);
  const qs = params.toString();
  return apiGet<Leaderboard>(`/game/leaderboard${qs ? `?${qs}` : ''}`);
}
