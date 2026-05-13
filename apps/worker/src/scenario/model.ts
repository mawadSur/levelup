/**
 * Pinned image model for scenario scene assets.
 *
 * Locked decision (see gamification-plan.md, Layer 3): pre-generate at seed
 * time, store once. Picking a single model means same prompt → same artwork
 * across reruns; the cache key is just the prompt hash.
 */
export const OPENAI_IMAGE_MODEL = 'gpt-image-1';
