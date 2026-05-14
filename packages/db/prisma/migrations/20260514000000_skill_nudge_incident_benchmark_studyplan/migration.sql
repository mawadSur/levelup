-- CreateEnum
CREATE TYPE "SkillTier" AS ENUM ('BEGINNER', 'PRACTITIONER', 'POWER_USER', 'CHAMPION');

-- CreateEnum
CREATE TYPE "CoachNudgeKind" AS ENUM ('REPEATED_SENSITIVE_PASTE', 'PROMPT_PATTERN_STUCK', 'UNTOUCHED_SKILL_AFTER_LESSON', 'STREAK_AT_RISK');

-- CreateEnum
CREATE TYPE "IncidentKind" AS ENUM ('SENSITIVE_DATA_LEAK', 'POLICY_VIOLATION', 'AD_RULE_VIOLATION', 'AI_HALLUCINATION_REPORTED', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'REMEDIATED', 'DISMISSED', 'SUGGESTED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "benchmarkOptOut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" "SkillTier" NOT NULL,
    "prerequisites" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_skills" (
    "lessonId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_skills_pkey" PRIMARY KEY ("lessonId","skillId")
);

-- CreateTable
CREATE TABLE "lab_skills" (
    "labId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_skills_pkey" PRIMARY KEY ("labId","skillId")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "exposure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "practice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transfer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("userId","skillId")
);

-- CreateTable
CREATE TABLE "coach_nudges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "CoachNudgeKind" NOT NULL,
    "body" TEXT NOT NULL,
    "suggestedTemplate" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),
    "actedOnAt" TIMESTAMP(3),

    CONSTRAINT "coach_nudges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "IncidentKind" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "triggeredBy" TEXT NOT NULL,
    "signal" JSONB NOT NULL,
    "assignedRemediationLabId" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_benchmark_snapshots" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "userSample" INTEGER NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "p50" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industry_benchmark_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "lessonIds" JSONB NOT NULL,
    "labIds" JSONB NOT NULL,
    "targetCompletionDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "skills_organizationId_idx" ON "skills"("organizationId");

-- CreateIndex
CREATE INDEX "skills_tier_idx" ON "skills"("tier");

-- CreateIndex
CREATE INDEX "lesson_skills_skillId_idx" ON "lesson_skills"("skillId");

-- CreateIndex
CREATE INDEX "lab_skills_skillId_idx" ON "lab_skills"("skillId");

-- CreateIndex
CREATE INDEX "user_skills_skillId_idx" ON "user_skills"("skillId");

-- CreateIndex
CREATE INDEX "coach_nudges_userId_generatedAt_idx" ON "coach_nudges"("userId", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "coach_nudges_organizationId_kind_generatedAt_idx" ON "coach_nudges"("organizationId", "kind", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "incidents_organizationId_openedAt_idx" ON "incidents"("organizationId", "openedAt" DESC);

-- CreateIndex
CREATE INDEX "incidents_organizationId_status_severity_idx" ON "incidents"("organizationId", "status", "severity");

-- CreateIndex
CREATE INDEX "incidents_userId_openedAt_idx" ON "incidents"("userId", "openedAt" DESC);

-- CreateIndex
CREATE INDEX "industry_benchmark_snapshots_industry_metric_period_idx" ON "industry_benchmark_snapshots"("industry", "metric", "period" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "industry_benchmark_snapshots_industry_period_metric_key" ON "industry_benchmark_snapshots"("industry", "period", "metric");

-- CreateIndex
CREATE INDEX "study_plans_userId_weekOf_idx" ON "study_plans"("userId", "weekOf" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "study_plans_userId_weekOf_key" ON "study_plans"("userId", "weekOf");

-- AddForeignKey
ALTER TABLE "lesson_skills" ADD CONSTRAINT "lesson_skills_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_skills" ADD CONSTRAINT "lesson_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_skills" ADD CONSTRAINT "lab_skills_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_skills" ADD CONSTRAINT "lab_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_nudges" ADD CONSTRAINT "coach_nudges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_nudges" ADD CONSTRAINT "coach_nudges_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assignedRemediationLabId_fkey" FOREIGN KEY ("assignedRemediationLabId") REFERENCES "labs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

