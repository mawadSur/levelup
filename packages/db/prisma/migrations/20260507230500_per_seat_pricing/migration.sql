-- Per-seat pricing — Part 1 of 2: enum additions only.
--
-- Postgres requires `ALTER TYPE … ADD VALUE` to be committed before the new
-- value can be used. Doing it in the same transaction as the column default
-- change fails with `55P04: unsafe use of new value`. So we split it: this
-- migration only adds the enum values; 20260507230501 sets defaults + columns.

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
