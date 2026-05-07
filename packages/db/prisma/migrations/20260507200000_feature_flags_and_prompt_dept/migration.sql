-- Department-shared prompts: scope a Prompt to a department in addition to org/user.
ALTER TABLE "prompts" ADD COLUMN "departmentId" TEXT;
CREATE INDEX "prompts_departmentId_idx" ON "prompts"("departmentId");
ALTER TABLE "prompts"
  ADD CONSTRAINT "prompts_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Feature flags: per-org overrides over a global default. organizationId NULL = global.
CREATE TABLE "feature_flags" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT,
  "key"            TEXT NOT NULL,
  "enabled"        BOOLEAN NOT NULL DEFAULT false,
  "rolloutPercent" INTEGER,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_flags_organizationId_key_key" ON "feature_flags"("organizationId", "key");
CREATE INDEX "feature_flags_organizationId_idx" ON "feature_flags"("organizationId");

ALTER TABLE "feature_flags"
  ADD CONSTRAINT "feature_flags_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
