# @levelup/auth-client

WorkOS SDK wrapper for LevelUp AI Academy. Used by the NestJS API for SSO/OAuth and by both the API and web app for session cookie management.

## Stub mode

When `WORKOS_API_KEY` starts with `PLACEHOLDER_` the package runs in **stub mode**. All WorkOS calls are bypassed and a dev-only magic-link flow is activated via `devBypass(email)`. Stub mode is blocked in `NODE_ENV=production`.

## Environment variables

| Variable              | Required        | Default                                   |
| --------------------- | --------------- | ----------------------------------------- |
| `WORKOS_API_KEY`      | yes             | —                                         |
| `WORKOS_CLIENT_ID`    | yes (real mode) | —                                         |
| `WORKOS_REDIRECT_URI` | no              | `http://localhost:3000/api/auth/callback` |
| `SESSION_SECRET`      | yes (real mode) | auto-derived in stub mode                 |
| `COOKIE_DOMAIN`       | no              | `localhost`                               |

`SESSION_SECRET` must be at least 32 characters in real mode.

## Session security

Sessions are **JWE-encrypted** (not just signed) using `jose` with `dir` + `A256GCM`. The 32-byte encryption key is derived by hashing `SESSION_SECRET` with SHA-256. This means the payload is opaque to the browser and cannot be read or tampered with without the server secret.

## Role hierarchy

`ADMIN > MANAGER > EMPLOYEE`

Use `hasRole(actual, required)` for checks and `assertRole(actual, required)` to throw on insufficient permissions.
