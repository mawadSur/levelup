-- Enable Row-Level Security on every public table.
--
-- Supabase's security advisor flagged the project for `rls_disabled_in_public`
-- and `sensitive_columns_exposed`: the anon + authenticated roles that back
-- the auto-generated PostgREST REST API at https://<project>.supabase.co/rest/v1
-- can currently read/write every table.
--
-- This app does not use the PostgREST API for data — all reads/writes go
-- through the backend API + Prisma, which connects as the database owner
-- (BYPASSRLS role). Enabling RLS without adding policies therefore locks
-- the PostgREST roles out completely while leaving the app untouched.
--
-- If a future feature genuinely needs PostgREST access, add an explicit
-- `CREATE POLICY` in its own migration alongside the change.

ALTER TABLE "ai_coach_sessions"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anomaly_alerts"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessment_items"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessments"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "badges"                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certificates"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coach_nudges"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_policies"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_turns"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_quests"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_export_requests"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dead_letter_jobs"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deletion_requests"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feature_flags"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incidents"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "industry_benchmark_snapshots"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lab_attempts"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lab_skills"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "labs"                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learning_path_assignments"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learning_paths"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lesson_embeddings"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lesson_image_assets"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lesson_scene_assets"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lesson_skills"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lessons"                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_integrations"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "path_generation_requests"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "processed_webhook_events"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prompts"                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_attempts"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_questions"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quizzes"                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_snapshots"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skills"                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_plans"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_game_state"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_onboarding"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_progress"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_skills"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users"                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "xp_events"                     ENABLE ROW LEVEL SECURITY;

-- Prisma's own bookkeeping table lives in `public` too, so the advisor
-- flags it the same way. The Prisma CLI manages this table as the
-- migration owner (BYPASSRLS) so enabling RLS here doesn't disrupt
-- `prisma migrate`/`prisma migrate status`.
ALTER TABLE "_prisma_migrations"            ENABLE ROW LEVEL SECURITY;
