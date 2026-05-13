/**
 * Per-lesson image storage helpers.
 *
 * Object key convention: "<lessonId>/<slot>.<ext>" inside the `lesson-images`
 * bucket. Lesson images are global content (lessons may have a null
 * organizationId), so a per-lesson prefix is enough — no org filtering. Files
 * are public-read because they are deterministic, regenerable artwork served
 * directly as `<img src>` without a signed-URL round-trip.
 *
 * Stub mode writes the bytes to
 * `<lessonImagesOutputDir>/<lessonId>/<slot>.<ext>` and returns a `file://`
 * URL. Callers that hit stub mode typically prefer the inline base64 SVG path
 * (the worker handler builds one directly when no API key is configured), so
 * the stub `file://` branch is rarely user-visible.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { storageConfig, isStubMode } from './config';
import { getSupabase } from './client';

export interface LessonImageUploadResult {
  storagePath: string;
  publicUrl: string;
}

export async function uploadLessonImage(
  lessonId: string,
  slot: number,
  bytes: Buffer,
  contentType: string,
): Promise<LessonImageUploadResult> {
  const ext = inferExt(contentType);
  const objectName = `${lessonId}/${slot}.${ext}`;

  if (isStubMode()) {
    const dir = path.join(storageConfig.lessonImagesOutputDir, lessonId);
    await fs.promises.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${slot}.${ext}`);
    await fs.promises.writeFile(filePath, bytes);
    return {
      storagePath: objectName,
      publicUrl: `file://${filePath}`,
    };
  }

  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from(storageConfig.lessonImagesBucket)
    .upload(objectName, bytes, {
      contentType,
      upsert: true,
    });
  if (uploadError) {
    throw new Error(
      `[storage] failed to upload lesson image ${objectName}: ${uploadError.message}`,
    );
  }

  const { data } = supabase.storage.from(storageConfig.lessonImagesBucket).getPublicUrl(objectName);
  return {
    storagePath: objectName,
    publicUrl: data.publicUrl,
  };
}

function inferExt(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}
