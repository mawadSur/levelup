CREATE TYPE "IntegrationProvider" AS ENUM ('SLACK', 'MS_TEAMS');
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ERROR');
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "AnomalyKind" AS ENUM ('COACH_USAGE_SPIKE', 'SENSITIVE_DATA_BURST', 'STREAK_BROKEN_AT_RISK', 'PATH_BUILDER_ABUSE', 'PROMPT_CLONING_ABUSE');

CREATE TABLE "organization_integrations" (
  "id"               TEXT NOT NULL,
  "organizationId"   TEXT NOT NULL,
  "provider"         "IntegrationProvider" NOT NULL,
  "status"           "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
  "externalTeamId"   TEXT NOT NULL,
  "externalTeamName" TEXT,
  "accessToken"      TEXT NOT NULL,
  "botToken"         TEXT,
  "botUserId"        TEXT,
  "scopes"           TEXT,
  "installedById"    TEXT NOT NULL,
  "metadata"         JSONB,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_integrations_organizationId_provider_key" ON "organization_integrations"("organizationId", "provider");
CREATE INDEX "organization_integrations_externalTeamId_idx" ON "organization_integrations"("externalTeamId");

ALTER TABLE "organization_integrations"
  ADD CONSTRAINT "organization_integrations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_integrations"
  ADD CONSTRAINT "organization_integrations_installedById_fkey"
  FOREIGN KEY ("installedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE TABLE "anomaly_alerts" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId"         TEXT,
  "kind"           "AnomalyKind" NOT NULL,
  "severity"       "AnomalySeverity" NOT NULL,
  "signal"         JSONB NOT NULL,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedBy" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "anomaly_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "anomaly_alerts_organizationId_createdAt_idx" ON "anomaly_alerts"("organizationId", "createdAt" DESC);
CREATE INDEX "anomaly_alerts_organizationId_severity_acknowledgedAt_idx" ON "anomaly_alerts"("organizationId", "severity", "acknowledgedAt");

ALTER TABLE "anomaly_alerts"
  ADD CONSTRAINT "anomaly_alerts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "anomaly_alerts"
  ADD CONSTRAINT "anomaly_alerts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "anomaly_alerts"
  ADD CONSTRAINT "anomaly_alerts_acknowledgedBy_fkey"
  FOREIGN KEY ("acknowledgedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
