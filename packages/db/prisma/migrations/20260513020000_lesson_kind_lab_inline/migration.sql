-- Lesson-kind pivot: labs become inline lesson types inside learning paths.
--
-- After this migration each lesson is one of three kinds: READ (markdown body,
-- the current behavior), SCENARIO (branching markdown rendered by the scenario
-- engine), or LAB (renders the lab runner inline using the referenced Lab row).
-- Lesson.labId points at the Lab; a Lab can be referenced by at most one Lesson
-- (UNIQUE on labId) but may exist without one for back-compat.

-- New enum.
CREATE TYPE "LessonKind" AS ENUM ('READ', 'SCENARIO', 'LAB');

-- Lesson gains kind + labId.
ALTER TABLE "lessons" ADD COLUMN "kind" "LessonKind" NOT NULL DEFAULT 'READ';
ALTER TABLE "lessons" ADD COLUMN "labId" TEXT;

CREATE UNIQUE INDEX "lessons_labId_key" ON "lessons"("labId");

ALTER TABLE "lessons" ADD CONSTRAINT "lessons_labId_fkey"
    FOREIGN KEY ("labId") REFERENCES "labs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
