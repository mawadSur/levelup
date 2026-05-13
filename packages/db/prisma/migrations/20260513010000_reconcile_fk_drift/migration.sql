-- Reconcile pre-existing FK drift on anomaly_alerts and organization_integrations.
--
-- These constraints exist in the DB but were created with subtly different metadata
-- from what Prisma's schema declares, so every `migrate diff` flags them. Re-adding
-- them with the explicit ON DELETE / ON UPDATE clauses makes Prisma stop complaining
-- and brings the DB definition into byte-for-byte sync with the schema.
--
-- Net effect: zero change to query behavior. Drop + re-add is benign in dev.

ALTER TABLE "anomaly_alerts" DROP CONSTRAINT "anomaly_alerts_acknowledgedBy_fkey";
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_acknowledgedBy_fkey"
    FOREIGN KEY ("acknowledgedBy") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "organization_integrations" DROP CONSTRAINT "organization_integrations_installedById_fkey";
ALTER TABLE "organization_integrations" ADD CONSTRAINT "organization_integrations_installedById_fkey"
    FOREIGN KEY ("installedById") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
