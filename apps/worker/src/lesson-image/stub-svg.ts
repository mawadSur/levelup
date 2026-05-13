/**
 * Stub-mode title card for a per-lesson image slot.
 *
 * Renders a deterministic, styled SVG card with the lesson id + slot number
 * baked in, returned as a base64 data URL. The dev never waits on an image
 * model API key — the card renders straight from the Lesson page.
 */

const INK = '#0f0a1a';
const ACCENT = '#7c5cff';
const PAPER = '#f5f1e8';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface LessonImageStubOptions {
  /** Lesson id this slot belongs to. */
  lessonId: string;
  /** Zero-based occurrence index of the `[image]` directive in the body. */
  slot: number;
  /** The directive prompt — truncated and shown as the card subtitle. */
  prompt: string;
}

export function buildStubLessonImageSvg({
  lessonId,
  slot,
  prompt,
}: LessonImageStubOptions): string {
  const title = escapeXml(`Lesson Image · Slot ${slot + 1}`);
  const subtitle = escapeXml(prompt.slice(0, 80));
  const idBadge = escapeXml(lessonId.slice(0, 8));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${INK}" />
      <stop offset="100%" stop-color="${ACCENT}" />
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#g)" />
  <rect x="40" y="40" width="880" height="460" fill="none" stroke="${PAPER}" stroke-opacity="0.18" stroke-width="2" rx="8" />
  <text x="80" y="172" font-family="Georgia, serif" font-size="48" font-style="italic" fill="${PAPER}">${title}</text>
  <text x="80" y="220" font-family="ui-monospace, SFMono-Regular, monospace" font-size="14" letter-spacing="2" fill="${PAPER}" opacity="0.55">STUB LESSON IMAGE · ${idBadge}</text>
  <text x="80" y="320" font-family="Georgia, serif" font-size="22" fill="${PAPER}" opacity="0.85">${subtitle}</text>
</svg>`;

  const base64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
