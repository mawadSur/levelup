-- Per-lesson image assets for READ-kind lessons.
--
-- Mirrors lesson_scene_assets but keyed on (lessonId, slot) where slot is the
-- zero-based occurrence index of an `[image]` directive in the lesson body.
-- promptHash is sha256(lessonId + slot + prompt) and lets the seed dedupe
-- across re-runs without consulting the image API.

CREATE TABLE "lesson_image_assets" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "promptHash" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_image_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_image_assets_promptHash_key" ON "lesson_image_assets"("promptHash");
CREATE UNIQUE INDEX "lesson_image_assets_lessonId_slot_key" ON "lesson_image_assets"("lessonId", "slot");

ALTER TABLE "lesson_image_assets" ADD CONSTRAINT "lesson_image_assets_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "lessons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
