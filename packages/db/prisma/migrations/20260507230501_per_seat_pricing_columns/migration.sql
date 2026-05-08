-- Per-seat pricing — Part 2 of 2: organization columns + new TRIAL default.
--
-- Runs after 20260507230500 commits the new TRIAL/TEAM enum values, so we
-- can safely set `plan` default to 'TRIAL'.

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
