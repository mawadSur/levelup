# @levelup/worker

Background job processor for LevelUp AI Academy.

Consumes BullMQ jobs from four queues and runs as a separate Node process from the API.

## Queues

| Queue              | Handler                    | Description                                          |
| ------------------ | -------------------------- | ---------------------------------------------------- |
| `cert-pdf`         | `jobs/cert-pdf.ts`         | Generate certificate PDF, write to disk, update DB   |
| `report-aggregate` | `jobs/report-aggregate.ts` | Aggregate completion stats, write to AuditLog        |
| `embed-content`    | `jobs/embed-content.ts`    | Chunk lesson, embed via OpenAI, upsert into pgvector |
| `send-email`       | `jobs/send-email.ts`       | Render template, send via Resend or write stub .eml  |

## Running

```bash
# Dev (tsx watch — rebuilds on file change)
pnpm dev

# Production
pnpm build && pnpm start
```

## Environment variables

| Variable                              | Default                                          | Description                                                   |
| ------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `REDIS_URL`                           | `redis://localhost:6379`                         | Redis connection URL                                          |
| `DATABASE_URL`                        | _(required)_                                     | Postgres connection string                                    |
| `RESEND_API_KEY`                      | _(required for real email)_                      | Resend API key. Any `PLACEHOLDER_*` value activates stub mode |
| `EMAIL_FROM`                          | `LevelUp AI Academy <noreply@levelupai.academy>` | From address                                                  |
| `APP_URL`                             | `http://localhost:3000`                          | Public app URL (used in email links)                          |
| `OPENAI_API_KEY`                      | _(required for real embeddings)_                 | OpenAI key. Any `PLACEHOLDER_*` value activates stub mode     |
| `LOG_LEVEL`                           | `info`                                           | Minimum log level: `debug`, `info`, `warn`, `error`           |
| `WORKER_CONCURRENCY_CERT_PDF`         | `2`                                              | BullMQ concurrency for cert-pdf                               |
| `WORKER_CONCURRENCY_REPORT_AGGREGATE` | `2`                                              | BullMQ concurrency for report-aggregate                       |
| `WORKER_CONCURRENCY_EMBED_CONTENT`    | `2`                                              | BullMQ concurrency for embed-content                          |
| `WORKER_CONCURRENCY_SEND_EMAIL`       | `2`                                              | BullMQ concurrency for send-email                             |
| `CERT_OUTPUT_DIR`                     | `apps/api/.cert-output/`                         | Directory for generated PDF files                             |
| `EMAIL_OUTBOX_DIR`                    | `apps/api/.outbox/`                              | Directory for stub .eml files                                 |

## Architecture decisions

### PDF generator location

`src/cert/pdf.ts` is the single source of truth for PDF generation.
The API does **not** call this directly — instead it enqueues a `cert-pdf` job
and serves the resulting file from disk at `GET /api/certificates/:id/file`
once the worker has written it. This avoids cross-app imports in the monorepo.

If a shared utility is ever needed (`@levelup/worker-cert`), the function can
be extracted without changing the worker call-site.

### Embedding — mean pooling

Long lesson bodies are split into paragraphs (≤ 1000 chars each). Each chunk
gets an embedding from `text-embedding-3-small`. The chunk vectors are
element-wise averaged (mean-pooled) into a single 1536-d vector before being
stored. This matches standard practice for document-level retrieval.

### ReportSnapshot — punted

The `ReportSnapshot` model has not yet been added to the Prisma schema.
`handleReportAggregate` computes the full stats and writes them as metadata on
an `AuditLog` row, returning the audit log id as a synthetic `reportId`.

**To complete this handoff:** add the model below to `packages/db/prisma/schema.prisma`,
run `pnpm db:migrate`, then replace the `auditLog.create` call in
`jobs/report-aggregate.ts` with a `reportSnapshot.upsert`.

```prisma
model ReportSnapshot {
  id             String   @id @default(cuid())
  organizationId String
  departmentId   String?
  periodStart    DateTime
  periodEnd      DateTime
  payload        Json
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, periodStart])
  @@map("report_snapshots")
}
```

Also add `reportSnapshots ReportSnapshot[]` to the `Organization` model relations.

### Resend stub mode

When `RESEND_API_KEY` is absent or starts with `PLACEHOLDER_`, the email
handler writes a `.eml` file to `apps/api/.outbox/` instead of calling Resend.
The `.eml` file is RFC 5322 compatible (multipart/alternative with text + HTML
parts) and can be opened in any mail client for inspection.

`resend-client.ts` throws immediately if called in stub mode — the handler
branches **before** reaching the client, so the stub path can never
accidentally fall through to a real send.
