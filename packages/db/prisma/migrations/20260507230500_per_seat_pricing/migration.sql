-- Per-seat pricing migration.
--
-- Foundational schema changes to support the per-seat pricing model:
--   - New plan tiers: TRIAL (default for new orgs) and TEAM.
--   - BillingInterval enum (MONTHLY | ANNUAL) for plans that bill annually.
--   - Subscription tracking columns on Organization so the webhook handler
--     can reflect Stripe state (price id, status) directly.
--   - Trial lifecycle columns (trialEndsAt, archivedAt) so the worker
--     trial-expiry job can run idempotently.
--
-- Migration safety:
--   - All new columns are nullable or have safe defaults.
--   - Existing STARTER orgs keep their plan; no rows are touched.
--   - The Plan default is changed to TRIAL going forward; no UPDATE applied
--     to existing rows so legacy flat-rate orgs are preserved as-is.

-- ── Plan enum: add TRIAL + TEAM values ─────────────────────────────────────
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'TEAM';

-- ── BillingInterval enum ───────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingInterval') THEN
    CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');
  END IF;
END $$;

-- ── Organization columns ───────────────────────────────────────────────────
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "billingInterval" "BillingInterval" DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- New orgs default to TRIAL with 10 seats. Existing rows keep their plan.
ALTER TABLE "organizations" ALTER COLUMN "plan" SET DEFAULT 'TRIAL';
ALTER TABLE "organizations" ALTER COLUMN "planSeats" SET DEFAULT 10;
