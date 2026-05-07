-- CR.33: AI-generated custom learning paths.
-- New enum + table tracking each admin's "build a path with AI" request.

-- 1. Enum -------------------------------------------------------------------
CREATE TYPE "PathGenerationStatus" AS ENUM (
  'PENDING',
  'GENERATING',
  'READY',
  'FAILED',
  'CANCELLED'
);

-- 2. Table ------------------------------------------------------------------
CREATE TABLE "path_generation_requests" (
  "id"              TEXT NOT NULL,
  "organizationId"  TEXT NOT NULL,
  "requestedById"   TEXT NOT NULL,
  "prompt"          TEXT NOT NULL,
  "audience"        TEXT,
  "status"          "PathGenerationStatus" NOT NULL DEFAULT 'PENDING',
  "failedReason"    TEXT,
  "generatedPathId" TEXT,
  "draft"           JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  "completedAt"     TIMESTAMP(3),
  CONSTRAINT "path_generation_requests_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes ----------------------------------------------------------------
CREATE INDEX "path_generation_requests_organizationId_createdAt_idx"
  ON "path_generation_requests" ("organizationId", "createdAt" DESC);
CREATE INDEX "path_generation_requests_status_idx"
  ON "path_generation_requests" ("status");

-- 4. Foreign keys -----------------------------------------------------------
ALTER TABLE "path_generation_requests"
  ADD CONSTRAINT "path_generation_requests_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "path_generation_requests"
  ADD CONSTRAINT "path_generation_requests_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "users" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "path_generation_requests"
  ADD CONSTRAINT "path_generation_requests_generatedPathId_fkey"
  FOREIGN KEY ("generatedPathId") REFERENCES "learning_paths" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
