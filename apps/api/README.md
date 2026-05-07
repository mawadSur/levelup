# @levelup/api

NestJS REST API for LevelUp AI Academy.

## Development

```bash
pnpm dev          # watch mode
pnpm build        # production build
pnpm start        # run compiled output
pnpm typecheck    # type-check without emitting
pnpm lint         # ESLint
pnpm test         # unit tests
pnpm test:e2e     # end-to-end tests
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Required keys (validated at boot by Zod):

| Variable              | Required | Default               |
| --------------------- | -------- | --------------------- |
| NODE_ENV              | no       | development           |
| API_PORT              | no       | 4000                  |
| WEB_ORIGIN            | no       | http://localhost:3000 |
| DATABASE_URL          | yes      | —                     |
| REDIS_URL             | yes      | —                     |
| OPENAI_API_KEY        | yes      | —                     |
| WORKOS_API_KEY        | yes      | —                     |
| WORKOS_CLIENT_ID      | yes      | —                     |
| STRIPE_SECRET_KEY     | yes      | —                     |
| STRIPE_WEBHOOK_SECRET | yes      | —                     |
| RESEND_API_KEY        | yes      | —                     |
| SESSION_SECRET        | yes      | —                     |
| COOKIE_DOMAIN         | no       | —                     |

`PLACEHOLDER_*` values are accepted so stub/offline mode works before real credentials are provisioned.

## API Docs

Swagger UI is available at `/api/docs` in non-production environments.
