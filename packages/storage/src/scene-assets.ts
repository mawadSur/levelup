/**
 * Scene-asset image storage helpers.
 *
 * Object key convention: "<lessonId>/<sceneSlug>.<ext>" inside the
 * `scene-assets` bucket. Scenario images are shared across organisations
 * because the Lesson itself is global content (organizationId may be null);
 * a per-lesson prefix is enough to keep keys tidy. Files are public-read so
 * the renderer can use them as plain `<img src>` without a signed-URL
 * round-trip — they are deterministic, regenerable artwork, not secrets.
 *
 * Stub mode writes the bytes to
 * `<sceneAssetsOutputDir>/<lessonId>/<sceneSlug>.<ext>` and returns a
 * `file://` URL. The renderer falls back to a base64 data URL in that
 * case (the worker handler builds one directly), so the stub `file://`
 * branch is only used if a caller asks for the URL via getSceneAssetUrl.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { storageConfig, isStubMode } from './config';
import { getSupabase } from './client';

export interface SceneAssetUploadResult {
  storagePath: string;
  publicUrl: string;
}

export async function uploadSceneAsset(
  lessonId: string,
  sceneSlug: string,
  bytes: Buffer,
  contentType: string,
): Promise<SceneAssetUploadResult> {
  const ext = inferExt(contentType);
  const objectName = `${lessonId}/${sceneSlug}.${ext}`;

  if (isStubMode()) {
    const dir = path.join(storageConfig.sceneAssetsOutputDir, lessonId);
    await fs.promises.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${sceneSlug}.${ext}`);
    await fs.promises.writeFile(filePath, bytes);
    return {
      storagePath: objectName,
      publicUrl: `file://${filePath}`,
    };
  }

  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from(storageConfig.sceneAssetsBucket)
    .upload(objectName, bytes, {
      contentType,
      upsert: true,
    });
  if (uploadError) {
    throw new Error(`[storage] failed to upload scene asset ${objectName}: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(storageConfig.sceneAssetsBucket).getPublicUrl(objectName);
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
