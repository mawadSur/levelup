-- Run ONCE in the Supabase SQL editor (or via psql) before applying migrations.
-- Supabase doesn't auto-enable these extensions; the Prisma init migration also
-- runs `CREATE EXTENSION IF NOT EXISTS` for each, but enabling them via the
-- Database → Extensions UI first lets the dashboard recognise them and avoids
-- a permission error on the first migration run for non-superuser roles.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
