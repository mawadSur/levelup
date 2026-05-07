-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "XpEventKind" AS ENUM (
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
    'BADGE_BONUS'
);

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- AlterTable
ALTER TABLE "badges"
    ADD COLUMN "description" TEXT,
    ADD COLUMN "iconKey" TEXT,
    ADD COLUMN "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
    ADD COLUMN "xpReward" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_game_state" (
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "weeklyXp" INTEGER NOT NULL DEFAULT 0,
    "weeklyXpResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "streakFreezes" INTEGER NOT NULL DEFAULT 0,
    "totalLessonsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalQuestsCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_game_state_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "XpEventKind" NOT NULL,
    "xp" INTEGER NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_quests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quests" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_quests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xp_events_userId_kind_sourceId_key" ON "xp_events"("userId", "kind", "sourceId");

-- CreateIndex
CREATE INDEX "xp_events_organizationId_createdAt_idx" ON "xp_events"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "xp_events_userId_createdAt_idx" ON "xp_events"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_quests_userId_date_key" ON "daily_quests"("userId", "date");

-- CreateIndex
CREATE INDEX "daily_quests_organizationId_date_idx" ON "daily_quests"("organizationId", "date");

-- AddForeignKey
ALTER TABLE "user_game_state" ADD CONSTRAINT "user_game_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_quests" ADD CONSTRAINT "daily_quests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_quests" ADD CONSTRAINT "daily_quests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
