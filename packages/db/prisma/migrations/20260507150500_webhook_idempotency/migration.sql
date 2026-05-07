-- CreateTable: provider-side idempotency log for webhook deliveries.
-- The primary key is the provider event id (Stripe `evt_...` or WorkOS event id).
-- Inserts conflict on duplicate, which the controller treats as "already processed".
CREATE TABLE "processed_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: support recent-events queries per provider for analytics/debug.
CREATE INDEX "processed_webhook_events_provider_processedAt_idx"
    ON "processed_webhook_events"("provider", "processedAt" DESC);
