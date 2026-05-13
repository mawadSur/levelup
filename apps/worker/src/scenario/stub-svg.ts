/**
 * Stub-mode title card.
 *
 * Renders a deterministic, styled SVG card with the scene slug + a short
 * silhouette of the cast. Returned as a base64 data URL so it can be served
 * straight from a Lesson page without any storage round-trip — dev never
 * waits on an image model API key.
 */

/** Background colour pulled from `@levelup/ui` deep-indigo brand. */
const INK = '#0f0a1a';
const ACCENT = '#7c5cff';
const PAPER = '#f5f1e8';

const CHARACTER_COLOR: Record<string, string> = {
  sara: '#7c5cff',
  dev: '#22d3ee',
  pat: '#f97316',
  narrator: '#a3a3a3',
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export interface StubSvgOptions {
  sceneSlug: string;
  characters: string[];
}

export function buildStubSceneSvg({ sceneSlug, characters }: StubSvgOptions): string {
  const title = escapeXml(titleCase(sceneSlug));
  const subtitle = escapeXml(
    `STUB SCENE · ${characters.map((c) => c.toUpperCase()).join(' · ') || '—'}`,
  );
  const dots = characters
    .slice(0, 4)
    .map((c, idx) => {
      const cx = 96 + idx * 88;
      const color = CHARACTER_COLOR[c.toLowerCase()] ?? PAPER;
      return `<circle cx="${cx}" cy="448" r="34" fill="${color}" opacity="0.85" />`;
    })
    .join('');

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
  <text x="80" y="172" font-family="Georgia, serif" font-size="56" font-style="italic" fill="${PAPER}">${title}</text>
  <text x="80" y="220" font-family="ui-monospace, SFMono-Regular, monospace" font-size="14" letter-spacing="2" fill="${PAPER}" opacity="0.55">${subtitle}</text>
  ${dots}
</svg>`;

  const base64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
