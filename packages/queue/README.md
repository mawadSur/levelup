# @levelup/queue

Typed BullMQ wrapper for **LevelUp AI Academy**.  
Defines the canonical job catalog so producers (API) and consumers (worker process) share the same strict input/output types and can never drift out of sync.

---

## Job catalog

| Job name           | Queue name         | Input                                                       | Output                  |
| ------------------ | ------------------ | ----------------------------------------------------------- | ----------------------- |
| `cert-pdf`         | `cert-pdf`         | `{ certificateId: string }`                                 | `{ pdfUrl: string }`    |
| `report-aggregate` | `report-aggregate` | `{ organizationId, departmentId?, periodStart, periodEnd }` | `{ reportId: string }`  |
| `embed-content`    | `embed-content`    | `{ lessonId: string }`                                      | `{ embedded: true }`    |
| `send-email`       | `send-email`       | `{ to, templateKey, data }`                                 | `{ messageId: string }` |

---

## Prerequisites

Redis must be running. Start the full infra stack with:

```bash
pnpm infra:up   # starts Redis (and other services) via docker-compose
```

Configure the connection by setting `REDIS_URL` in your environment (default: `redis://localhost:6379`).  
For TLS connections use the `rediss://` scheme.

---

## Usage

### Enqueuing a job (producer / API side)

```ts
import { enqueueCertPdf, enqueueEmail } from '@levelup/queue';

// TypeScript enforces the exact input shape.
await enqueueCertPdf({ certificateId: 'cert_abc123' });

await enqueueEmail({
  to: 'alice@example.com',
  templateKey: 'certificate',
  data: { name: 'Alice', courseName: 'Prompt Engineering 101' },
});
```

You can also use the generic `getQueue` factory when you need access to the raw `Queue` instance (e.g., for bulk adds or pause/resume):

```ts
import { getQueue } from '@levelup/queue';

const q = getQueue('embed-content'); // Queue<EmbedContentInput, EmbedContentOutput>
await q.addBulk([...]);
```

### Running a worker (consumer side)

Use `tsx` for development or run the compiled output for production.

**Development (tsx):**

```bash
# from repo root:
pnpm --filter @levelup/queue exec tsx src/workers/cert-pdf.worker.ts

# or directly:
cd packages/queue
npx tsx src/workers/cert-pdf.worker.ts
```

**Production (compiled):**

```bash
pnpm --filter @levelup/queue build
node dist/workers/cert-pdf.worker.js
```

### Example worker file

```ts
// src/workers/cert-pdf.worker.ts
import { createWorker } from '@levelup/queue';

const worker = createWorker(
  'cert-pdf',
  async (job) => {
    // job.data is typed as CertPdfInput: { certificateId: string }
    const { certificateId } = job.data;

    const pdfUrl = await generatePdf(certificateId);

    // Return type must satisfy CertPdfOutput: { pdfUrl: string }
    return { pdfUrl };
  },
  { concurrency: 5 },
);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
```

---

## Extending the catalog

Adding a new job requires updating **three** files (the compiler enforces this via exhaustive `Record<JobName, ...>` and `keyof JobMap` constraints):

1. **`src/types.ts`** — add input/output interfaces and add the entry to `JobMap`.
2. **`src/jobs.ts`** — add the registration (queue name + default opts) to `JOBS`.
3. **`src/queues.ts`** — add a typed `enqueueXxx` helper.
4. **`src/index.ts`** — re-export the new helper and any new types.

---

## Configuration

| Env var     | Default                  | Description                                     |
| ----------- | ------------------------ | ----------------------------------------------- |
| `REDIS_URL` | `redis://localhost:6379` | ioredis connection string (`rediss://` for TLS) |

Default job options (overridable per-job via `JOBS[name].defaultOpts`):

```ts
{
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { count: 1000 },
  removeOnFail:    { count: 5000 },
}
```

---

## Build

```bash
pnpm build       # tsc → dist/
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint src/
pnpm clean       # rm -rf dist/
```
