-- LearningPath gets three new columns to support the tiered curriculum:
--
--   tier               — groups paths in the curriculum map (Apprentice →
--                        Practitioner → Specialist → Hero). Reuses AiLevel
--                        as the type so we don't introduce a parallel enum.
--   isCore             — true for paths every employee must complete
--                        (AI Basics, Kapitus Foundations).
--   prerequisiteSlugs  — JSON array of path slugs that must be completed
--                        before this path unlocks. Stored as JSON so the
--                        seed + admin UI can edit it without a join table.
--
-- Defaults are chosen so existing rows render correctly without backfill:
--   - tier defaults to BEGINNER (Apprentice tier).
--   - isCore defaults to false.
--   - prerequisiteSlugs defaults to an empty JSON array.

ALTER TABLE "learning_paths"
  ADD COLUMN IF NOT EXISTS "tier" "AiLevel" NOT NULL DEFAULT 'BEGINNER',
  ADD COLUMN IF NOT EXISTS "isCore" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "prerequisiteSlugs" JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS "learning_paths_tier_idx" ON "learning_paths"("tier");
