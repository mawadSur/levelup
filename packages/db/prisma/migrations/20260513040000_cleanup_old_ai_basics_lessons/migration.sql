-- One-time cleanup: the AI Basics path used to seed 3 hardcoded read lessons
-- (`what-is-generative-ai`, `prompting-fundamentals`, `verifying-ai-output`).
-- The curriculum rework replaces them with 5 new lessons keyed by different
-- slugs, so the old rows would orphan inside the path's lesson list.
--
-- Cascading deletes pick up dependent UserProgress + QuizAttempt + LessonImageAsset
-- + LessonSceneAsset rows automatically via existing FK ON DELETE CASCADE.

DELETE FROM "lessons"
WHERE "slug" IN (
  'what-is-generative-ai',
  'prompting-fundamentals',
  'verifying-ai-output'
)
AND "learningPathId" IN (
  SELECT "id" FROM "learning_paths" WHERE "slug" = 'ai-basics'
);
