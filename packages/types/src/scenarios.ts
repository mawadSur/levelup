import { z } from 'zod';

/**
 * Story-scenario schemas.
 *
 * Scenario lessons are normal Lesson rows whose body is parsed at render
 * time into a tree of scenes. The shapes here are the runtime contract
 * between the parser (in `@levelup/db`) and the React renderer (in
 * `apps/web`). Mirroring them in zod gives the API a cheap way to validate
 * future server-side scenario authoring without re-implementing the parser.
 */

export const characterKeySchema = z.enum(['sara', 'dev', 'pat', 'narrator']);
export type CharacterKey = z.infer<typeof characterKeySchema>;

export const imageModeSchema = z.enum(['ai', 'static', 'none']);
export type ImageMode = z.infer<typeof imageModeSchema>;

export const scenarioLineSchema = z.object({
  character: characterKeySchema,
  text: z.string().min(1).max(2000),
});
export type ScenarioLine = z.infer<typeof scenarioLineSchema>;

export const scenarioChoiceSchema = z.object({
  label: z.string().min(1).max(160),
  next: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'scene slug: lowercase letters, digits, dashes'),
});
export type ScenarioChoice = z.infer<typeof scenarioChoiceSchema>;

export const scenarioSceneSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'scene slug: lowercase letters, digits, dashes'),
  characters: z.array(characterKeySchema).max(8),
  lines: z.array(scenarioLineSchema).min(0).max(60),
  imagePrompt: z.string().min(1).max(2000).nullable(),
  choices: z.array(scenarioChoiceSchema).max(6).nullable(),
  terminal: z.boolean(),
});
export type ScenarioScene = z.infer<typeof scenarioSceneSchema>;

export const scenarioFrontmatterSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(2).max(200),
  kind: z.literal('scenario'),
  estimatedMinutes: z.number().int().min(1).max(60),
  characters: z.array(characterKeySchema).max(8),
  imageMode: imageModeSchema,
  orderIndex: z.number().int().min(0).max(999).optional(),
});
export type ScenarioFrontmatter = z.infer<typeof scenarioFrontmatterSchema>;

export const parsedScenarioSchema = z.object({
  frontmatter: scenarioFrontmatterSchema,
  scenes: z.array(scenarioSceneSchema).min(1).max(40),
});
export type ParsedScenario = z.infer<typeof parsedScenarioSchema>;

/**
 * sceneSlug → blob (or stub data-URL) for the pre-generated scene image.
 * Empty when none of the scenes carry an [image] cue, or when no worker has
 * filled in `LessonSceneAsset` rows yet — the renderer falls back to a
 * pure-text bubble in that case.
 */
export type SceneAssetMap = Record<string, string>;
