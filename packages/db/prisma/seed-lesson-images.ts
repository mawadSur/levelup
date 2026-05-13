/**
 * Per-lesson image seeder.
 *
 * Walks every Lesson row of `kind: READ` whose body contains one or more
 * `[image] <prompt>` directives. For each directive, either:
 *
 *  1. Enqueues a `generate-lesson-image` BullMQ job (production / dev with
 *     Redis up + AI key present), and ALSO pre-writes a deterministic stub
 *     SVG so the lesson page never renders a missing-image placeholder.
 *  2. Falls back to the stub branch unconditionally when Redis is unreachable
 *     (`pnpm db:seed` run without `pnpm infra:up`).
 *
 * Idempotent — keys writes on (lessonId, slot) and the promptHash unique
 * constraint dedupes re-runs.
 *
 * Wiring: `seed.ts` invokes this AFTER `seedScenarios` so every Lesson row
 * is in place.
 */

import * as crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

/** Same `[image] <prompt>` directive shape the scenario parser recognises. */
const IMAGE_DIRECTIVE_RE = /^\[image\]\s+(.+)$/i;

interface ImageDirective {
  slot: number;
  prompt: string;
}

function extractImageDirectives(body: string): ImageDirective[] {
  const out: ImageDirective[] = [];
  let slot = 0;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    const match = line.match(IMAGE_DIRECTIVE_RE);
    if (!match) continue;
    const prompt = match[1]!.trim();
    if (!prompt) continue;
    out.push({ slot, prompt });
    slot += 1;
  }
  return out;
}

function computePromptHash(lessonId: string, slot: number, prompt: string): string {
  return crypto.createHash('sha256').update(`${lessonId}|${slot}|${prompt}`).digest('hex');
}

/**
 * Try to import @levelup/queue and enqueue. Returns null when Redis is
 * unreachable so the caller can fall through to the unconditional stub
 * branch. Mirrors `seed-scenarios.ts`'s probe.
 */
async function loadEnqueuer(): Promise<
  | null
  | ((input: {
      lessonId: string;
      slot: number;
      prompt: string;
      promptHash: string;
    }) => Promise<void>)
> {
  const url = process.env['REDIS_URL'] ?? '';
  if (!url) return null;
  const reachable = await pingRedis(url);
  if (!reachable) return null;
  try {
    const mod = (await import('@levelup/queue')) as {
      enqueueGenerateLessonImage: (input: {
        lessonId: string;
        slot: number;
        prompt: string;
        promptHash: string;
      }) => Promise<unknown>;
    };
    return async (input) => {
      await mod.enqueueGenerateLessonImage(input);
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
 * Build the same deterministic SVG card the worker uses in stub mode.
 * Inlined here so the seed has zero dependency on the worker package.
 */
function buildStubSvgDataUrl(lessonId: string, slot: number, prompt: string): string {
  const title = `Lesson Image · Slot ${slot + 1}`;
  const subtitle = prompt.slice(0, 80);
  const idBadge = lessonId.slice(0, 8);
  const escape = (s: string): string =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
  <text x="80" y="172" font-family="Georgia, serif" font-size="48" font-style="italic" fill="#f5f1e8">${escape(title)}</text>
  <text x="80" y="220" font-family="ui-monospace, monospace" font-size="14" letter-spacing="2" fill="#f5f1e8" opacity="0.55">STUB LESSON IMAGE · ${escape(idBadge)}</text>
  <text x="80" y="320" font-family="Georgia, serif" font-size="22" fill="#f5f1e8" opacity="0.85">${escape(subtitle)}</text>
</svg>`;
  const base64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

interface SeedLessonImagesResult {
  lessonsScanned: number;
  directivesFound: number;
  imagesEnqueued: number;
  stubAssetsWritten: number;
}

export async function seedLessonImages(prisma: PrismaClient): Promise<SeedLessonImagesResult> {
  const lessons = await prisma.lesson.findMany({
    where: { kind: 'READ' },
    select: { id: true, body: true },
  });

  const enqueue = await loadEnqueuer();
  let directivesFound = 0;
  let imagesEnqueued = 0;
  let stubAssetsWritten = 0;

  for (const lesson of lessons) {
    const directives = extractImageDirectives(lesson.body);
    if (directives.length === 0) continue;
    directivesFound += directives.length;

    for (const { slot, prompt } of directives) {
      const promptHash = computePromptHash(lesson.id, slot, prompt);

      const existing = await prisma.lessonImageAsset.findUnique({
        where: { lessonId_slot: { lessonId: lesson.id, slot } },
        select: { id: true },
      });
      if (!existing) {
        const blobUrl = buildStubSvgDataUrl(lesson.id, slot, prompt);
        await prisma.lessonImageAsset.create({
          data: { lessonId: lesson.id, slot, promptHash, blobUrl },
        });
        stubAssetsWritten += 1;
      }

      if (enqueue) {
        try {
          await enqueue({ lessonId: lesson.id, slot, prompt, promptHash });
          imagesEnqueued += 1;
        } catch {
          // Stub row already in place — nothing further to do.
        }
      }
    }
  }

  return {
    lessonsScanned: lessons.length,
    directivesFound,
    imagesEnqueued,
    stubAssetsWritten,
  };
}
