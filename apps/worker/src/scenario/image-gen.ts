/**
 * Scene-image generator (real mode).
 *
 * Pinned model: OpenAI `gpt-image-1` (the current Vercel AI Gateway / OpenAI
 * image endpoint). Chosen because:
 *   - it returns base64 PNG bytes we can store directly,
 *   - costs are predictable (one call per unique scene, cached forever),
 *   - the same OPENAI_API_KEY drives the rest of the stack.
 *
 * Stub mode is handled by the calling handler — this module assumes
 * `isStubMode()` returned false.
 */

import { OPENAI_IMAGE_MODEL } from './model.js';

const IMAGE_ENDPOINT = 'https://api.openai.com/v1/images/generations';

export interface RenderSceneImageInput {
  imagePrompt: string;
  characters: string[];
}

export interface RenderSceneImageResult {
  /** Raw PNG bytes from the model. */
  bytes: Buffer;
  contentType: 'image/png';
  modelUsed: string;
}

function buildPrompt(input: RenderSceneImageInput): string {
  const castLine =
    input.characters.length > 0 ? `Cast in frame: ${input.characters.join(', ')}.` : '';
  // Stable prefix → cache-friendly. Style is consistent across every scene
  // so the cast keeps a recognisable look.
  return [
    'Illustrated workplace scene, soft duotone palette of deep indigo and warm cream,',
    'editorial storyboard style, 16:9 framing, minimal background, no text or logos.',
    castLine,
    `Scene: ${input.imagePrompt}.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export async function renderSceneImage(
  input: RenderSceneImageInput,
  apiKey: string,
): Promise<RenderSceneImageResult> {
  const prompt = buildPrompt(input);

  const res = await fetch(IMAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `[scenario/image-gen] image API ${res.status}: ${detail.slice(0, 240) || 'no body'}`,
    );
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('[scenario/image-gen] image API returned no b64_json payload');
  }

  return {
    bytes: Buffer.from(b64, 'base64'),
    contentType: 'image/png',
    modelUsed: OPENAI_IMAGE_MODEL,
  };
}
