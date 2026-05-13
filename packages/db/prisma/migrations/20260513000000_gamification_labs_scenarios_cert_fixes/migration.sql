-- Gamification: hands-on Labs, scenario scene assets, cert auto-render, leaderboard opt-out.
--
-- This migration is additive only. Pre-existing schema/DB drift (anomaly_alerts +
-- organization_integrations FK onDelete semantics, learning_paths_tier_idx) is intentionally
-- left untouched and should be reconciled in a separate cleanup migration.

-- New XP event kind for passing a lab.
ALTER TYPE "XpEventKind" ADD VALUE 'LAB_PASSED';

-- Per-user leaderboard opt-out (default visible; user can hide via /profile toggle).
ALTER TABLE "users" ADD COLUMN "leaderboardOptOut" BOOLEAN NOT NULL DEFAULT false;

-- Lab: sandboxed AI scenario.
CREATE TABLE "labs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "learningPathId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "seededContext" JSONB NOT NULL,
    "rubric" JSONB NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "modelKey" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "labs_slug_key" ON "labs"("slug");
CREATE INDEX "labs_organizationId_idx" ON "labs"("organizationId");
CREATE INDEX "labs_learningPathId_idx" ON "labs"("learningPathId");

ALTER TABLE "labs" ADD CONSTRAINT "labs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "labs" ADD CONSTRAINT "labs_learningPathId_fkey"
    FOREIGN KEY ("learningPathId") REFERENCES "learning_paths"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- LabAttempt: one learner submission + grader result.
CREATE TABLE "lab_attempts" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "transcript" JSONB NOT NULL,
    "graderRaw" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "criteria" JSONB NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lab_attempts_userId_labId_idx" ON "lab_attempts"("userId", "labId");
CREATE INDEX "lab_attempts_labId_createdAt_idx" ON "lab_attempts"("labId", "createdAt" DESC);

ALTER TABLE "lab_attempts" ADD CONSTRAINT "lab_attempts_labId_fkey"
    FOREIGN KEY ("labId") REFERENCES "labs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_attempts" ADD CONSTRAINT "lab_attempts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_attempts" ADD CONSTRAINT "lab_attempts_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- LessonSceneAsset: pre-generated scenario scene image.
CREATE TABLE "lesson_scene_assets" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sceneSlug" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_scene_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_scene_assets_promptHash_key" ON "lesson_scene_assets"("promptHash");
CREATE UNIQUE INDEX "lesson_scene_assets_lessonId_sceneSlug_key" ON "lesson_scene_assets"("lessonId", "sceneSlug");

ALTER TABLE "lesson_scene_assets" ADD CONSTRAINT "lesson_scene_assets_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
