/**
 * Cloudflare R2 client (S3-compatible) — CR.26.
 *
 * R2 exposes the standard S3 wire protocol behind
 *   https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
 * which means we can drive it with `@aws-sdk/client-s3` + the v3 presigner.
 *
 * Construction is lazy so the SDK never loads when running in stub or
 * Supabase-only mode (saves ~1MB of cold-start cost for the worker).
 *
 * Service-role equivalent: the access key/secret pair has full bucket access.
 * Never expose this client to a browser.
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig, isR2Configured } from './config';

let _client: S3Client | null = null;

function r2Endpoint(): string {
  return `https://${storageConfig.r2AccountId}.r2.cloudflarestorage.com`;
}

export function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('[storage] getR2Client() called while R2 is not configured — this is a bug');
  }
  if (_client === null) {
    _client = new S3Client({
      // R2 only supports a single virtual region; "auto" is the documented value.
      region: 'auto',
      endpoint: r2Endpoint(),
      credentials: {
        accessKeyId: storageConfig.r2AccessKeyId,
        secretAccessKey: storageConfig.r2SecretAccessKey,
      },
      // R2 is S3-compatible but path-style is more forgiving across CDN/proxy
      // configurations, especially when buckets contain dots.
      forcePathStyle: true,
    });
  }
  return _client;
}

export interface R2UploadOptions {
  contentType?: string;
  cacheControl?: string;
}

/**
 * Uploads an object to the configured R2 bucket. Returns the object key.
 * Throws on transport/credential errors so the caller can surface a failed-job
 * state — we never silently swallow upload failures.
 */
export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  options: R2UploadOptions = {},
): Promise<string> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: storageConfig.r2Bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType,
      CacheControl: options.cacheControl,
    }),
  );
  return key;
}

/**
 * Mints a presigned GET URL for a previously-uploaded R2 object.
 * Default TTL: 15 minutes (cert downloads are typically clicked from the
 * email or the in-app cert list within a session window).
 */
export async function getSignedDownloadUrl(
  key: string,
  ttlSeconds: number = 15 * 60,
): Promise<string> {
  const client = getR2Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: storageConfig.r2Bucket,
      Key: key,
    }),
    { expiresIn: ttlSeconds },
  );
}
