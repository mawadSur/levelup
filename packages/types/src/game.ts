import { z } from 'zod';

export const questStatusSchema = z.enum(['PENDING', 'COMPLETED', 'EXPIRED']);
export type QuestStatus = z.infer<typeof questStatusSchema>;

export const xpEventKindSchema = z.enum([
  'LESSON_COMPLETED',
  'LESSON_FIRST_TIME',
  'QUIZ_PASSED_FIRST_TRY',
  'QUIZ_PASSED_RETRY',
  'PATH_COMPLETED',
  'COACH_PROMPT_FIXED',
  'PROMPT_CLONED',
  'DAILY_QUEST',
  'STREAK_7',
  'STREAK_30',
  'ASSESSMENT_BASELINE',
  'BADGE_BONUS',
]);

export const gameStateSchema = z.object({
  level: z.number().int().min(1),
  xp: z.number().int().min(0),
  xpToNextLevel: z.number().int().min(0),
  xpAtCurrentLevel: z.number().int().min(0),
  xpForNextLevel: z.number().int().min(0),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  weeklyXp: z.number().int().min(0),
  totalLessonsCompleted: z.number().int().min(0),
  streakFreezes: z.number().int().min(0),
});

export const dailyQuestKindSchema = z.enum(['lesson', 'coach', 'prompt', 'quiz', 'streak']);

export const dailyQuestItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  kind: dailyQuestKindSchema,
  target: z.number().int().min(1),
  progress: z.number().int().min(0),
  claimed: z.boolean(),
  xpReward: z.number().int().min(0),
});

export const dailyQuestsSchema = z.object({
  date: z.string(),
  quests: z.array(dailyQuestItemSchema).length(3),
});

export const claimQuestSchema = z.object({
  slug: z.string(),
});

export const leaderboardEntrySchema = z.object({
  userId: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  departmentName: z.string().nullable(),
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  rank: z.number().int().min(1),
});

export const leaderboardScopeSchema = z.enum(['org', 'department', 'me']);
export const leaderboardPeriodSchema = z.enum(['week', 'month', 'all']);

export const leaderboardSchema = z.object({
  scope: leaderboardScopeSchema,
  period: leaderboardPeriodSchema,
  entries: z.array(leaderboardEntrySchema),
});

export type XpEventKind = z.infer<typeof xpEventKindSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type DailyQuestKind = z.infer<typeof dailyQuestKindSchema>;
export type DailyQuestItem = z.infer<typeof dailyQuestItemSchema>;
export type DailyQuests = z.infer<typeof dailyQuestsSchema>;
export type ClaimQuestInput = z.infer<typeof claimQuestSchema>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type LeaderboardScope = z.infer<typeof leaderboardScopeSchema>;
export type LeaderboardPeriod = z.infer<typeof leaderboardPeriodSchema>;
export type Leaderboard = z.infer<typeof leaderboardSchema>;
