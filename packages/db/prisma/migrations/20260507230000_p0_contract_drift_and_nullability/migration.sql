-- P0 schema additions for contract-drift fixes and Supabase migration prep.
--
-- 1. Make Prompt.organizationId nullable so global library prompts can carry
--    NULL (the prompts service already queries with `IS NULL` semantics — the
--    column being NOT NULL forced casts via `as Prisma.PromptWhereInput`).
-- 2. Add User.supabaseUserId — populated by Agent B during the WorkOS→Supabase
--    Auth swap. workosUserId is intentionally retained so the swap can run
--    without data loss.
-- 3. Add Certificate.storagePath — Agent C will write the Supabase Storage
--    object key here when cert PDFs move out of local fs.
-- 4. Add CompanyPolicy.fileStoragePath — same pattern for uploaded policy
--    files.

-- ── Prompt.organizationId nullable ─────────────────────────────────────────
ALTER TABLE "prompts" ALTER COLUMN "organizationId" DROP NOT NULL;

-- ── User.supabaseUserId (nullable, unique) ─────────────────────────────────
ALTER TABLE "users" ADD COLUMN "supabaseUserId" TEXT;
CREATE UNIQUE INDEX "users_supabaseUserId_key" ON "users"("supabaseUserId");

-- ── Certificate.storagePath ────────────────────────────────────────────────
ALTER TABLE "certificates" ADD COLUMN "storagePath" TEXT;

-- ── CompanyPolicy.fileStoragePath ──────────────────────────────────────────
ALTER TABLE "company_policies" ADD COLUMN "fileStoragePath" TEXT;
