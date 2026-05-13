/**
 * Scenario markdown parser (server / seed-side copy).
 *
 * The web bundle imports the identical parser from `@levelup/types` so it
 * doesn't have to pull `@levelup/db` (and therefore `@prisma/client`) into
 * the Next.js server runtime. Keep the two files in sync — they are
 * intentionally duplicated rather than re-exported because the dependency
 * graph runs `@levelup/types` → `@levelup/db`, which means `@levelup/db`
 * cannot import from `@levelup/types` without introducing a cycle.
 *
 * Source of truth: `packages/types/src/scenario-parser.ts`.
 */

export type CharacterKey = 'sara' | 'dev' | 'pat' | 'narrator';

export type ImageMode = 'ai' | 'static' | 'none';

export interface ScenarioFrontmatter {
  slug: string;
  title: string;
  kind: 'scenario';
  estimatedMinutes: number;
  characters: CharacterKey[];
  imageMode: ImageMode;
  orderIndex?: number;
}

export interface ScenarioLine {
  character: CharacterKey;
  text: string;
}

export interface ScenarioChoice {
  label: string;
  next: string;
}

export interface ScenarioScene {
  slug: string;
  characters: CharacterKey[];
  lines: ScenarioLine[];
  imagePrompt: string | null;
  choices: ScenarioChoice[] | null;
  terminal: boolean;
}

export interface ParsedScenario {
  frontmatter: ScenarioFrontmatter;
  scenes: ScenarioScene[];
}

const CHARACTER_KEYS: ReadonlySet<string> = new Set(['sara', 'dev', 'pat', 'narrator']);

function asCharacterKey(raw: string): CharacterKey {
  const v = raw.trim().toLowerCase();
  if (!CHARACTER_KEYS.has(v)) {
    throw new ScenarioParseError(
      `unknown character "${raw}" — expected one of: sara, dev, pat, narrator`,
    );
  }
  return v as CharacterKey;
}

export class ScenarioParseError extends Error {
  constructor(message: string) {
    super(`[scenario-parser] ${message}`);
    this.name = 'ScenarioParseError';
  }
}

function parseFrontmatter(raw: string): {
  frontmatter: ScenarioFrontmatter;
  body: string;
} {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    throw new ScenarioParseError('missing YAML frontmatter');
  }
  const yaml = match[1] ?? '';
  const body = (match[2] ?? '').trim();

  const fields: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    fields[key] = value;
  }

  const slug = fields.slug;
  const title = fields.title;
  if (!slug || !title) {
    throw new ScenarioParseError('frontmatter must include slug and title');
  }
  if ((fields.kind ?? '').toLowerCase() !== 'scenario') {
    throw new ScenarioParseError(
      `frontmatter kind must be "scenario" (got "${fields.kind ?? ''}")`,
    );
  }

  const imageMode = (fields.imageMode ?? 'ai').toLowerCase();
  if (imageMode !== 'ai' && imageMode !== 'static' && imageMode !== 'none') {
    throw new ScenarioParseError(
      `imageMode must be ai | static | none (got "${fields.imageMode ?? ''}")`,
    );
  }

  const characters = parseInlineList(fields.characters ?? '[]').map(asCharacterKey);

  return {
    frontmatter: {
      slug,
      title,
      kind: 'scenario',
      estimatedMinutes: parseInt(fields.estimatedMinutes ?? '7', 10) || 7,
      characters,
      imageMode: imageMode as ImageMode,
      orderIndex:
        fields.orderIndex !== undefined ? parseInt(fields.orderIndex, 10) || 0 : undefined,
    },
    body,
  };
}

function parseInlineList(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '[]') return [];
  const inner = trimmed.replace(/^\[/, '').replace(/\]$/, '');
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function parseScenes(body: string): ScenarioScene[] {
  const lines = body.split('\n');
  const scenes: ScenarioScene[] = [];

  let current: ScenarioScene | null = null;
  let inChoice = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const line = raw.trim();

    if (!line) {
      // Don't reset inChoice on blank lines — the scenario format allows a
      // blank line between `[choice]` and the first `-` bullet (and between
      // bullets). inChoice is reset only by scene headers or by encountering
      // a non-bullet content line inside the choice block.
      continue;
    }

    const sceneHeader = line.match(/^##\s+([a-z0-9][a-z0-9-]*)\s*$/i);
    if (sceneHeader) {
      if (current) scenes.push(current);
      current = {
        slug: sceneHeader[1]!.toLowerCase(),
        characters: [],
        lines: [],
        imagePrompt: null,
        choices: null,
        terminal: true,
      };
      inChoice = false;
      continue;
    }

    if (!current) continue;

    if (inChoice) {
      const bullet = line.match(/^-\s+(.*)$/);
      if (bullet) {
        const choice = parseChoiceLine(bullet[1] ?? '');
        if (current.choices === null) current.choices = [];
        current.choices.push(choice);
        current.terminal = false;
        continue;
      }
      inChoice = false;
    }

    if (/^\[choice\]\s*$/i.test(line)) {
      inChoice = true;
      if (current.choices === null) current.choices = [];
      continue;
    }

    const image = line.match(/^\[image\]\s+(.+)$/i);
    if (image) {
      current.imagePrompt = image[1]!.trim();
      continue;
    }

    const dialogue = line.match(/^\[([a-z]+)\]\s+(.+)$/i);
    if (dialogue) {
      const character = asCharacterKey(dialogue[1] ?? '');
      let text = (dialogue[2] ?? '').trim();
      text = text.replace(/^[“"]/, '').replace(/[”"]$/, '');
      current.lines.push({ character, text });
      if (!current.characters.includes(character)) {
        current.characters.push(character);
      }
      continue;
    }

    if (current.lines.length > 0) {
      const last = current.lines[current.lines.length - 1]!;
      last.text = `${last.text} ${line}`.trim();
    }
  }

  if (current) scenes.push(current);

  for (const s of scenes) {
    if (s.choices && s.choices.length > 0) s.terminal = false;
  }

  return scenes;
}

function parseChoiceLine(raw: string): ScenarioChoice {
  const sep = raw.includes('→') ? '→' : '->';
  const idx = raw.lastIndexOf(sep);
  if (idx === -1) {
    throw new ScenarioParseError(`choice line missing "→ <scene-slug>": "${raw}"`);
  }
  const labelPart = raw.slice(0, idx).trim();
  const nextPart = raw.slice(idx + sep.length).trim();
  if (!nextPart) {
    throw new ScenarioParseError(`choice line missing destination scene: "${raw}"`);
  }
  const label = labelPart.replace(/^[“"]/, '').replace(/[”"]$/, '').trim();
  return { label: label || nextPart, next: nextPart };
}

export function parseScenario(markdown: string): ParsedScenario {
  const { frontmatter, body } = parseFrontmatter(markdown);
  const scenes = parseScenes(body);
  if (scenes.length === 0) {
    throw new ScenarioParseError(`scenario "${frontmatter.slug}" has no scenes`);
  }
  return { frontmatter, scenes };
}

export function parseScenarioBody(body: string): ScenarioScene[] {
  return parseScenes(body.trim());
}

export function looksLikeScenarioBody(body: string): boolean {
  if (!body) return false;
  const trimmed = body.trim();
  if (!/^##\s+[a-z0-9][a-z0-9-]*/im.test(trimmed)) return false;
  return /\[(image|narrator|sara|dev|pat|choice)\]/i.test(trimmed);
}
