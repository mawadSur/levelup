/**
 * Scenario seeder.
 *
 * Walks every `<path-slug>/<file>.scenario.md` under
 * `packages/db/content/`, parses it, and:
 *
 *  1. Upserts the Lesson row (keyed by learningPathId + slug) so the scenario
 *     replaces or sits alongside whichever plain-markdown lesson previously
 *     held that slug. The body stored on the Lesson is the raw scenario
 *     markdown (frontmatter stripped) so the API/web can re-parse on read
 *     without needing a separate column.
 *
 *  2. For every scene that carries an `[image]` cue, either enqueues a
 *     `generate-scene-asset` BullMQ job (production / dev with Redis up) or
 *     synchronously stamps an inline SVG `LessonSceneAsset` row (CI / no
 *     Redis). Either branch leaves the DB in the same shape — the worker
 *     simply replaces the inline SVG with a real image when it eventually
 *     processes the job.
 *
 * Idempotent — re-running with no content changes is a no-op.
 *
 * Wiring: import { seedScenarios } and call `await seedScenarios(prisma, org.id)`
 * AFTER all LearningPath + Lesson rows for the org have been created.
 *
 * NOTE FOR ORCHESTRATOR: this module is invoked from `seed.ts` via a single
 * `await seedScenarios(prisma, org.id)` line — see the report at the end of
 * the scenarios agent run for the exact insertion point.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { parseScenario, type ParsedScenario, type ScenarioScene } from '../src/scenario-parser';

const CONTENT_ROOT = path.join(__dirname, '..', 'content');

interface DiscoveredScenario {
  /** e.g. "ai-basics" — matches LearningPath.slug. */
  pathSlug: string;
  /** Absolute path to the .scenario.md file. */
  filePath: string;
  parsed: ParsedScenario;
}

function findScenarioFiles(): DiscoveredScenario[] {
  const out: DiscoveredScenario[] = [];
  if (!fs.existsSync(CONTENT_ROOT)) return out;

  for (const pathSlug of fs.readdirSync(CONTENT_ROOT)) {
    const pathDir = path.join(CONTENT_ROOT, pathSlug);
    if (!fs.statSync(pathDir).isDirectory()) continue;
    const lessonsDir = path.join(pathDir, 'lessons');
    if (!fs.existsSync(lessonsDir)) continue;

    for (const file of fs.readdirSync(lessonsDir)) {
      if (!file.endsWith('.scenario.md')) continue;
      const filePath = path.join(lessonsDir, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = parseScenario(raw);
      out.push({ pathSlug, filePath, parsed });
    }
  }
  return out;
}

function computePromptHash(scene: ScenarioScene): string {
  const sortedCharacters = [...scene.characters].sort().join(',');
  const input = `${scene.slug}|${scene.imagePrompt ?? ''}|${sortedCharacters}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Strip the YAML frontmatter from the raw scenario markdown so the Lesson
 * row carries only the body. The renderer re-parses on read.
 */
function stripFrontmatter(raw: string): string {
  const match = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
  return (match?.[1] ?? raw).trim();
}

/**
 * Try to import @levelup/queue and enqueue async. Returns a function that
 * either enqueues (real path) or falls through (CI / Redis-down path).
 *
 * We probe Redis with a short PING before returning the enqueuer — without
 * that probe, a stale REDIS_URL pointing at an unreachable host would cause
 * the first `add()` call to retry forever (ioredis default retryStrategy)
 * and the seed would hang. With the probe we just fall through to the stub
 * branch and the dev still gets usable SVG assets.
 */
async function loadEnqueuer(): Promise<
  | null
  | ((input: {
      lessonId: string;
      sceneSlug: string;
      imagePrompt: string;
      characters: string[];
      promptHash: string;
    }) => Promise<void>)
> {
  const url = process.env['REDIS_URL'] ?? '';
  if (!url) return null;

  // Probe Redis directly — cheap, side-effect free, and avoids importing
  // bullmq (which would spin up the queue's persistent connection) when the
  // host is unreachable.
  const reachable = await pingRedis(url);
  if (!reachable) return null;

  try {
    const mod = (await import('@levelup/queue')) as {
      enqueueGenerateSceneAsset: (input: {
        lessonId: string;
        sceneSlug: string;
        imagePrompt: string;
        characters: string[];
        promptHash: string;
      }) => Promise<unknown>;
    };
    return async (input) => {
      await mod.enqueueGenerateSceneAsset(input);
    };
  } catch {
    return null;
  }
}

async function pingRedis(url: string): Promise<boolean> {
  let host: string;
  let port: number;
  try {
    const parsed = new URL(url);
    host = parsed.hostname || 'localhost';
    port = parsed.port ? parseInt(parsed.port, 10) : 6379;
  } catch {
    return false;
  }
  const { createConnection } = await import('node:net');
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host, port, timeout: 500 });
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.once('timeout', () => done(false));
  });
}

/**
 * Build the same deterministic SVG title card the worker uses in stub
 * mode. Inlined here so the seed has zero dependency on the worker — CI
 * never imports BullMQ.
 */
function buildStubSvgDataUrl(sceneSlug: string, characters: string[]): string {
  const palette = ['#7c5cff', '#22d3ee', '#f97316', '#a3a3a3'];
  const dots = characters
    .slice(0, 4)
    .map((c, idx) => {
      const cx = 96 + idx * 88;
      const color = palette[idx] ?? '#f5f1e8';
      return `<circle cx="${cx}" cy="448" r="34" fill="${color}" opacity="0.85" />`;
    })
    .join('');
  const title = sceneSlug
    .split('-')
    .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
  const subtitle = `STUB SCENE · ${characters.map((c) => c.toUpperCase()).join(' · ') || '—'}`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f0a1a" />
      <stop offset="100%" stop-color="#7c5cff" />
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#g)" />
  <rect x="40" y="40" width="880" height="460" fill="none" stroke="#f5f1e8" stroke-opacity="0.18" stroke-width="2" rx="8" />
  <text x="80" y="172" font-family="Georgia, serif" font-size="56" font-style="italic" fill="#f5f1e8">${title}</text>
  <text x="80" y="220" font-family="ui-monospace, monospace" font-size="14" letter-spacing="2" fill="#f5f1e8" opacity="0.55">${subtitle}</text>
  ${dots}
</svg>`;
  const base64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

interface SeedScenariosResult {
  filesProcessed: number;
  lessonsUpserted: number;
  scenesEnqueued: number;
  stubAssetsWritten: number;
}

/**
 * Public entry point. Caller passes the demo / Kapitus org id whose
 * LearningPath rows the scenarios should attach to. Lessons that already
 * exist under (learningPathId, slug) are updated in place — the scenario
 * body simply replaces whatever prose was there.
 */
export async function seedScenarios(
  prisma: PrismaClient,
  organizationId: string,
): Promise<SeedScenariosResult> {
  const discovered = findScenarioFiles();
  if (discovered.length === 0) {
    return { filesProcessed: 0, lessonsUpserted: 0, scenesEnqueued: 0, stubAssetsWritten: 0 };
  }

  const enqueue = await loadEnqueuer();
  let lessonsUpserted = 0;
  let scenesEnqueued = 0;
  let stubAssetsWritten = 0;

  for (const item of discovered) {
    const learningPath = await prisma.learningPath.findUnique({
      where: { organizationId_slug: { organizationId, slug: item.pathSlug } },
      select: { id: true },
    });
    if (!learningPath) {
      // No path → no lesson to attach. The Labs / curriculum agents own
      // path creation, so missing a path here just means this scenario file
      // is ahead of its host path. Skip silently.
      continue;
    }

    const raw = fs.readFileSync(item.filePath, 'utf8');
    const body = stripFrontmatter(raw);

    const lesson = await prisma.lesson.upsert({
      where: {
        learningPathId_slug: {
          learningPathId: learningPath.id,
          slug: item.parsed.frontmatter.slug,
        },
      },
      update: {
        title: item.parsed.frontmatter.title,
        body,
        estimatedMinutes: item.parsed.frontmatter.estimatedMinutes,
      },
      create: {
        learningPathId: learningPath.id,
        title: item.parsed.frontmatter.title,
        slug: item.parsed.frontmatter.slug,
        body,
        estimatedMinutes: item.parsed.frontmatter.estimatedMinutes,
        orderIndex: item.parsed.frontmatter.orderIndex ?? 99,
      },
      select: { id: true },
    });
    lessonsUpserted += 1;

    if (item.parsed.frontmatter.imageMode !== 'ai') continue;

    for (const scene of item.parsed.scenes) {
      if (!scene.imagePrompt) continue;
      const promptHash = computePromptHash(scene);

      const existing = await prisma.lessonSceneAsset.findUnique({
        where: { lessonId_sceneSlug: { lessonId: lesson.id, sceneSlug: scene.slug } },
        select: { id: true, promptHash: true },
      });

      // Always ensure a usable SVG row exists — the worker upserts a real
      // image over the top if/when it later processes the job. This means
      // dev never sees an empty image slot even with no Redis / no API key,
      // and re-running the seed before the worker drains the queue doesn't
      // skip the stub write.
      if (!existing) {
        const blobUrl = buildStubSvgDataUrl(scene.slug, scene.characters);
        await prisma.lessonSceneAsset.create({
          data: {
            lessonId: lesson.id,
            sceneSlug: scene.slug,
            promptHash,
            blobUrl,
          },
        });
        stubAssetsWritten += 1;
      }

      if (enqueue) {
        try {
          await enqueue({
            lessonId: lesson.id,
            sceneSlug: scene.slug,
            imagePrompt: scene.imagePrompt,
            characters: scene.characters,
            promptHash,
          });
          scenesEnqueued += 1;
        } catch {
          // Enqueue failed (e.g., Redis went down between probe and call).
          // The stub row above is already in place — no further action.
        }
      }
    }
  }

  return {
    filesProcessed: discovered.length,
    lessonsUpserted,
    scenesEnqueued,
    stubAssetsWritten,
  };
}
