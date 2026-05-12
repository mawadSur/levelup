-- Persist the assessmentSessionId on each Assessment so duplicate submits
-- (network retry, double-click, replay) collapse onto the same row instead of
-- creating multiple scored attempts.
ALTER TABLE "assessments" ADD COLUMN "assessmentSessionId" TEXT;

-- Postgres treats NULL as distinct in unique indexes, so legacy rows with a
-- NULL assessmentSessionId don't collide with each other. New rows always set
-- the column, so the constraint catches repeats by (user, type, session).
CREATE UNIQUE INDEX "assessments_userId_type_assessmentSessionId_key"
  ON "assessments"("userId", "type", "assessmentSessionId");
