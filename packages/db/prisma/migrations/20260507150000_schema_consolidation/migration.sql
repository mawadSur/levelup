-- Schema consolidation migration
--
-- Consolidates several deferred schema additions:
--   1. User.deactivatedAt — replaces the workosUserId-nullification workaround
--      in users.service.ts deactivateUser.
--   2. Organization.paymentFailed / paymentFailedAt — flagged on
--      invoice.payment_failed Stripe webhook events.
--   3. Per-org email uniqueness — User.email is no longer globally unique;
--      uniqueness is scoped to (organizationId, email). Closes a tenant
--      isolation hole in the invitation flow.
--   4. ReportSnapshot — first-class storage for aggregated report payloads
--      previously stashed in AuditLog.metadata.

-- ── User ────────────────────────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

-- ── Organization ────────────────────────────────────────────────────────────
ALTER TABLE "organizations" ADD COLUMN "paymentFailed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN "paymentFailedAt" TIMESTAMP(3);

-- ── Per-org email uniqueness ────────────────────────────────────────────────
-- Drop the global email unique index and replace with a composite (organizationId, email).
-- A different person at a different org may now share the same email; one
-- physical user has one row per org. WorkOS user id remains globally unique.
DROP INDEX "users_email_key";
CREATE UNIQUE INDEX "users_organizationId_email_key" ON "users"("organizationId", "email");

-- ── ReportSnapshot ──────────────────────────────────────────────────────────
CREATE TABLE "report_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "report_snapshots_organizationId_createdAt_idx" ON "report_snapshots"("organizationId", "createdAt" DESC);
CREATE INDEX "report_snapshots_organizationId_departmentId_periodStart_idx" ON "report_snapshots"("organizationId", "departmentId", "periodStart");

ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
