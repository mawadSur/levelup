# @levelup/db

Prisma client + schema for LevelUp AI Academy.

## What's here

- `prisma/schema.prisma` — Postgres schema with `vector`, `pg_trgm`, `pgcrypto` extensions
- `prisma/migrations/0_init` — initial migration (enables extensions, creates tables)
- `prisma/seed.ts` — demo org, 4 users, 3 learning paths x 3 lessons x 1 quiz x 2 questions
- `src/index.ts` — singleton `PrismaClient` (HMR-safe via `globalThis`)
- `src/client.ts` — re-exports Prisma types and enums

## Local setup

You need Postgres 15+ with the `vector`, `pg_trgm`, and `pgcrypto` extensions
available. The repo's `infra/docker-compose.yml` brings up `pgvector/pgvector:pg16`,
which has all three.

```sh
# 1. Bring up the local Postgres + Redis
pnpm infra:up

# 2. Copy env
cp .env.example .env.local
# (DATABASE_URL is already set to the docker-compose service)

# 3. Generate the Prisma client
pnpm db:generate

# 4. Apply migrations (creates extensions, tables, enums)
pnpm db:migrate

# 5. Seed demo data
pnpm db:seed

# 6. Optional: open Prisma Studio
pnpm db:studio
```

## Notes

- `LessonEmbedding.embedding` uses `Unsupported("vector(1536)")` because Prisma
  has no first-class `vector` type. Read/write via `prisma.$queryRaw` /
  `$executeRaw` with `pgvector` literals.
- The `Organization` model and `Invitation` model are the only ones without a
  hard `organizationId` FK; everything else is multi-tenant scoped.
- `LearningPath.organizationId` is **nullable** — null means a global template
  shared with every tenant; non-null means it's a custom path for that tenant.
