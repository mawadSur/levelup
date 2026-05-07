# @levelup/web

Next.js 15 (App Router) front-end for LevelUp AI Academy.

## Getting started

```bash
pnpm dev
```

App runs on `http://localhost:3000` by default. Override with `WEB_PORT`.

Requires the API running on port 4000:

```bash
pnpm --filter @levelup/api dev
```

## Environment variables

| Variable              | Description                                           | Required                                 |
| --------------------- | ----------------------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL                                  | No (defaults to `http://localhost:4000`) |
| `NEXT_PUBLIC_APP_URL` | Public URL of this app                                | No (defaults to `http://localhost:3000`) |
| `SESSION_SECRET`      | Mirrors API secret — not used by the web app directly | No                                       |
