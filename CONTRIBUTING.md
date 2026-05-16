# Contributing

Short guide for landing changes in this monorepo. For setup details see
`README.md` and `SETUP.md`; for module-level conventions see
`docs/module-conventions.md`; for runbooks see `docs/runbooks/`.

## Quickstart

```bash
pnpm install
pnpm infra:up          # Postgres + Redis via docker compose
pnpm db:migrate        # apply Prisma migrations
pnpm dev               # web (3000) + api (4000) in parallel
```

Prereqs: Node 20.10+, pnpm 9, Docker. `nvm use` picks the right Node from
`.nvmrc`. `pnpm infra:up` is a thin wrapper around `docker compose -f
infra/docker-compose.yml up -d`.

## Branching

- Feature branches off `main`. Name them descriptively
  (`fix/auth-cookie-fallback`, `feat/incident-promotion`).
- PRs target `main`. Squash-and-merge is preferred so the history reads
  one-commit-per-change.
- No long-lived branches. Land behind a flag (`apps/api/src/modules/flags`)
  rather than diverging.

## Commit convention

`<type>(<scope>): <subject>` — matches the existing log
(`fix(auth): forward Cookie header to /api/auth/me`,
`chore(format): apply prettier to markdown-view.tsx`).

Types:

- `feat` — user-visible new capability
- `fix` — bug fix
- `chore` — non-user-visible maintenance (deps, formatting, deploys)
- `docs` — documentation only
- `ci` — CI config / workflow changes
- `refactor` — internal restructure with no behavior change
- `test` — adding or fixing tests
- `perf` — performance work
- Optional: `p0`/`p1` style scopes for prioritised follow-ups
  (`fix(p0): close P0 CEO-review items`) are accepted.

Keep the subject in the imperative ("add", "fix", not "added", "fixes"),
under ~70 chars. Use the body for the why if it's not obvious from the
diff.

## Test expectations

- Unit tests live next to the code they exercise (`*.test.ts`) and run
  under vitest via `pnpm test`. Add or update them where they already
  exist for the touched module.
- The canonical post-deploy validator is the deployed Playwright suite
  (`e2e/playwright.deployed.config.ts`, specs in `e2e/specs-deployed/`).
  Anything that touches an auth, paywall, billing, or `/learn` flow must
  pass the deployed run before merge.
- Local Playwright configs (`playwright.config.ts`,
  `playwright.local-realauth.config.ts`) exist but are flakier and not the
  source of truth for ship-readiness.

## Local checks before opening a PR

```bash
pnpm typecheck
pnpm test
```

If you touched DB schema, run `pnpm db:generate && pnpm db:migrate` and
commit the generated migration. If you touched modules registered in
`apps/api/src/modules/index.ts`, no edits to `app.module.ts` are needed.

## References

- `docs/module-conventions.md` — org scoping, audit logs, RBAC, validation,
  rate limiting, pagination.
- `docs/runbooks/` — incident response, Postgres backup, deploy procedures.
- `README.md`, `SETUP.md` — environment + service wiring.
