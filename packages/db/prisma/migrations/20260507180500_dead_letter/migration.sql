-- Dead-letter queue: terminally failed BullMQ jobs (attempts exhausted).
CREATE TABLE "dead_letter_jobs" (
  "id"           TEXT NOT NULL,
  "jobName"      TEXT NOT NULL,
  "jobId"        TEXT NOT NULL,
  "attempts"     INTEGER NOT NULL,
  "failedReason" TEXT NOT NULL,
  "data"         JSONB NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dead_letter_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dead_letter_jobs_jobName_createdAt_idx" ON "dead_letter_jobs"("jobName", "createdAt" DESC);
