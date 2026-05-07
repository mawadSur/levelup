-- Conversation memory + onboarding state
CREATE TYPE "TurnRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "conversations" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "title"          TEXT,
  "archivedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversations_userId_createdAt_idx" ON "conversations"("userId", "createdAt" DESC);
CREATE INDEX "conversations_organizationId_createdAt_idx" ON "conversations"("organizationId", "createdAt" DESC);

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "conversation_turns" (
  "id"                    TEXT NOT NULL,
  "conversationId"        TEXT NOT NULL,
  "role"                  "TurnRole" NOT NULL,
  "content"               TEXT NOT NULL,
  "sensitiveDataDetected" BOOLEAN NOT NULL DEFAULT false,
  "tokensUsed"            INTEGER NOT NULL DEFAULT 0,
  "modelUsed"             TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_turns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversation_turns_conversationId_createdAt_idx" ON "conversation_turns"("conversationId", "createdAt");

ALTER TABLE "conversation_turns"
  ADD CONSTRAINT "conversation_turns_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_coach_sessions" ADD COLUMN "conversationId" TEXT;
CREATE INDEX "ai_coach_sessions_conversationId_createdAt_idx" ON "ai_coach_sessions"("conversationId", "createdAt");
ALTER TABLE "ai_coach_sessions"
  ADD CONSTRAINT "ai_coach_sessions_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "user_onboarding" (
  "userId"         TEXT NOT NULL,
  "currentStep"    INTEGER NOT NULL DEFAULT 0,
  "completedSteps" JSONB NOT NULL DEFAULT '[]',
  "dismissedAt"    TIMESTAMP(3),
  "completedAt"    TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_onboarding_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "user_onboarding"
  ADD CONSTRAINT "user_onboarding_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
