# Module conventions

How feature modules under `apps/api/src/modules/<name>/` are structured.
Reference for engineers adding a new module or auditing an existing one.
Each section names a real file you can grep. When a convention varies in
practice, the "current state varies, target is X" wording calls it out.

## 1. Org scoping

Every read, mutation, and audit-log write filters on `organizationId` taken
from `req.user.organizationId` (a `SessionPayload` injected by `AuthGuard`).
Services never accept an org id from the request body. The pattern is
visible in `apps/api/src/modules/prompts/prompts.service.ts` (visibility
union including `organizationId: user.organizationId` plus a global-library
clause where `organizationId IS NULL`) and in
`apps/api/src/modules/learning/paths/paths.service.ts` (`createPath` writes
`organizationId: user.organizationId`; `updatePath`/`deletePath` reject
cross-org access with `ForbiddenException` when `existing.organizationId !==
user.organizationId`).

Convention: load the row by primary key first, then check
`row.organizationId === user.organizationId` before mutating. For reads,
combine the org filter into the `where` clause. Global/shared library rows
(`organizationId: null`) are an explicit opt-in — list them with an `OR`
clause and document why on the service.

## 2. Audit log naming

Every privileged mutation writes a row to `AuditLog` via
`prisma.auditLog.create({ data: { organizationId, actorId, action,
targetType, targetId, metadata } })`. The `action` string is lowercase
`<module>.<verb>`, dot-separated. The verb is whatever reads naturally for
the action — usually a single past-tense or imperative word, sometimes
snake_case for multi-word actions.

Examples taken from the codebase:

- `prompt.create`, `prompt.update`, `prompt.delete`, `prompt.clone`, `prompt.share`
- `path.create`, `path.update`, `path.delete`, `path.assign`, `path.unassign`, `path.bulk_save`
- `policy.publish`, `policy.delete_version`
- `auth.dev_bypass`, `auth.signout`, `auth.invitation_accepted`
- `lab.created`, `lab.updated`, `lab.run`, `lab.attempt`, `lab.passed`
- `flag.upsert`, `flag.delete`
- `incident.opened`, `incident.acknowledged`, `incident.remediated`, `incident.dismissed`, `incident.promoted`
- `coach.invoke`, `coach.sensitive_data_detected`, `coach.create_conversation`
- `org.create_via_signup`, `org.trial_started`, `org.benchmark_opt_out_changed`
- `user.update_role`, `user.update_department`, `user.update_ai_level`, `user.deactivate`

Current state varies: some modules wrap the call in a private `auditLog()`
helper (`PoliciesService.auditLog`, `PromptsService.writeAuditLog`); others
inline the `prisma.auditLog.create` call (`PathsService`, `LessonsService`).
Target is: a per-service helper when the module emits more than two
distinct actions; inline is fine for one-off writes. Either way, the
`<module>.<verb>` action key is non-negotiable so log search/aggregation
works.

## 3. RBAC

The global `APP_GUARD` registrations in
`apps/api/src/modules/auth/auth.module.ts` install `AuthGuard` (validates
the Supabase JWT and attaches `req.user`) and `RoleGuard` (enforces
`@Roles(...)` metadata). Every route is authenticated by default.

To open a route to unauthenticated callers, decorate it with `@Public()`
(`apps/api/src/common/decorators/public.decorator.ts`). To require a
specific role, decorate the handler or controller with `@Roles('ADMIN',
'MANAGER', ...)` — `RoleGuard` treats the array as a minimum-role
requirement using `RolePriority` (ADMIN > MANAGER > EMPLOYEE), so a
controller-level `@Roles('MANAGER')` lets ADMIN through as well.

One-line example from `apps/api/src/modules/insights/insights.controller.ts`:

```ts
@UseGuards(AuthGuard, RoleGuard)
@Roles('MANAGER') // ADMIN satisfies this via role priority
@Controller('insights')
export class InsightsController { ... }
```

(The `@UseGuards` on the controller is redundant with the global guards but
is currently kept on most controllers as inline documentation. Either form
is acceptable.)

## 4. Validation

All controllers receive zod-validated inputs. The global `ValidationPipe`
is registered in `apps/api/src/main.ts` with `{ whitelist: true, transform:
true, forbidNonWhitelisted: true }`, but the canonical pattern for body
validation is the per-endpoint `ZodValidationPipe`
(`apps/api/src/common/pipes/zod-validation.pipe.ts`), constructed with a
zod schema from `packages/types`:

```ts
@Post('accept-invitation')
async acceptInvitation(
  @Body(new ZodValidationPipe(acceptInvitationSchema)) body: AcceptInvitationInput,
) { ... }
```

DTOs live in `apps/api/src/modules/<name>/dto/` and re-export the schema +
inferred type from `packages/types`. See
`apps/api/src/modules/prompts/dto/save-prompt.dto.ts` for the canonical
shape: re-export `savePromptSchema` from `@levelup/types`, declare a
`SavePromptDto` type. The schema is the source of truth; the type is for
typed parameter signatures only.

## 5. Rate limiting

User-input endpoints that hit external APIs or are abusable when
unauthenticated use the Redis-backed sliding-window limiter
`checkRateLimit` from `@levelup/queue`. The pattern is a per-module guard
that calls `checkRateLimit` and throws `429 TOO_MANY_REQUESTS` with a
`Retry-After` header.

Examples:

- `apps/api/src/modules/auth/guards/auth-rate-limit.guard.ts` — IP-keyed,
  decorator-configured per route. Used on `dev-bypass` (30/min) and
  `accept-invitation` (5/min), since the caller has no JWT yet.
- `apps/api/src/modules/labs/labs-rate-limit.guard.ts` — user-keyed,
  10/min, applied to `POST /labs/:id/attempts`.
- `apps/api/src/modules/coach/rate-limit.guard.ts` — user-keyed, the
  original consumer; `auth-rate-limit.guard.ts` is modelled on it.

Convention: key by `user.userId` for authenticated endpoints, by IP for
public ones. Window defaults to 60 seconds. The guard must fail open if
Redis is down (this is the contract `@levelup/queue/checkRateLimit`
provides — a Redis outage degrades to unlimited rather than 500ing every
request). Add a new guard per module rather than reusing another module's
bucket — collisions across modules would be misleading.

One-use example, from `auth.controller.ts`:

```ts
@Public()
@Post('accept-invitation')
@AuthRateLimit('accept-invitation', 5)
async acceptInvitation(...) { ... }
```

## 6. Pagination

Cursor-based pagination is the convention for any list that can grow
without bound. There are two shapes in the codebase:

- **Opaque cursor over a unique key** (the common case). See
  `apps/api/src/modules/anomaly/anomaly.service.ts:listAlerts` — `take =
limit + 1`, `cursor: { id }`, `skip: cursor ? 1 : 0`, derive `nextCursor`
  from the last item's `id` when the result overflows.
- **Composite keyset cursor** for `(createdAt DESC, id DESC)` ordering. See
  `apps/api/src/modules/prompts/prompts.service.ts:listPrompts` — the
  cursor is `${ISO}__${id}`, filtered with an `OR` over `createdAt < ts`
  plus a tiebreaker on `id` for equal timestamps. Use this shape when the
  natural sort is by `createdAt` and you need stable ordering across
  inserts with the same timestamp. `admin-ops.service.ts` does the same
  with a base64-encoded JSON cursor.

Response shape: `{ items: T[], nextCursor: string | null }` (or `{ data:
T[], nextCursor }` in older code — varies). Target: `{ items, nextCursor
}`. `total` may be included when the caller needs it (e.g. anomaly
counts), but is optional — a separate count query is honest and avoids
forcing every list to compute `COUNT(*)`.

Offset pagination is not used for list endpoints. Don't introduce it
without a written reason — it scales poorly past a few thousand rows and
returns inconsistent pages under writes.
