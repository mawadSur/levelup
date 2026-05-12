-- Organization.slug is a stable, human-readable identifier that lets the
-- platform reference a specific org (e.g. the shared Kapitus org for
-- white-label single-tenant deployments) without hardcoding cuids.
ALTER TABLE "organizations" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
