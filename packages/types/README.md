# @levelup/types

Shared Zod schemas + inferred TS types used by `apps/api` and `apps/web`.

Each domain has its own file (`auth`, `learning`, `coach`, `billing`, `admin`).
Every schema exports both the Zod object (e.g. `inviteUserSchema`) and the
inferred type (`InviteUserInput`).

Prisma enums (`Role`, `AiLevel`, `Plan`, `LessonStatus`, `AssessmentType`,
`InvitationStatus`) are re-exported from `@levelup/db` so callers only need to
import from one place.

## Build

```sh
pnpm --filter @levelup/types build
pnpm --filter @levelup/types typecheck
```

Note: typechecking depends on `@levelup/db` having generated the Prisma client
(`pnpm db:generate`) so that enum values resolve.
