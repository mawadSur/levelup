export { GameModule } from './game.module';
export { GameService } from './game.service';
export type { AwardXpInput, AwardXpResult } from './game.service';
export { LEVEL_THRESHOLDS, MAX_LEVEL, levelFromXp, xpForLevel, xpToNextLevel } from './level-curve';
export { XP_AWARDS, xpForKind } from './xp-rules';
export { applyDailyActivity, crossedThreshold, daysBetweenUtc, startOfUtcDay } from './streak';
export type { StreakResult, StreakSnapshot } from './streak';
export { generateDailyQuests, isoDateUtc } from './quest-generator';
export type { GenerateQuestsInput, QuestTemplate } from './quest-generator';
