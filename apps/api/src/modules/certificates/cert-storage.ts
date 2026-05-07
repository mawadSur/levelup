/**
 * Certificate PDF storage abstraction — T2.15
 *
 * Provides two implementations behind a single interface:
 *   1. LocalFsCertStorage  — writes to `apps/api/.cert-output/<id>.pdf`
 *      and exposes a `/api/certificates/:id/file` streaming route.
 *      This is used for local development.
 *
 *   2. CloudCertStorage    — TODO: upload to S3 / R2 / Supabase Storage and
 *      return a presigned URL.  Stubbed with a guard that throws an error in
 *      production until the cloud provider is configured.
 *
 * Production migration path:
 *   1. Implement CloudCertStorage.store() by uploading `pdfBuffer` to your
 *      storage provider (AWS S3, Cloudflare R2, Supabase Storage, etc.).
 *   2. Return the presigned URL (or a permanent public URL) as `pdfUrl`.
 *   3. Swap the export alias at the bottom of this file to `CloudCertStorage`.
 *   4. Set the `CERT_STORAGE_PROVIDER` env var to `cloud` to trigger the
 *      correct branch in the factory (if you prefer not to swap the export).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface CertStorageResult {
  /**
   * The public-facing URL that consumers can use to retrieve the PDF.
   * For local storage this is an internal API route; for cloud it is a
   * presigned / CDN URL.
   */
  pdfUrl: string;
}

export interface ICertStorage {
  /**
   * Persist a generated PDF buffer for a given certificate.
   * Returns the public URL where the PDF can be retrieved.
   */
  store(certificateId: string, pdfBuffer: Buffer): Promise<CertStorageResult>;
}

// ---------------------------------------------------------------------------
// Local filesystem implementation (development only)
// ---------------------------------------------------------------------------

/**
 * Output directory: `apps/api/.cert-output/`
 * The directory is created on first write if it does not exist.
 */
const LOCAL_OUTPUT_DIR = path.resolve(
  __dirname,
  '../../../../../.cert-output', // relative to compiled dist/modules/certificates/
);

/**
 * The route prefix that CertificatesController exposes for streaming.
 * Must match the `@Get(':id/file')` route in `certificates.controller.ts`.
 */
const LOCAL_API_PREFIX = '/api/certificates';

export class LocalFsCertStorage implements ICertStorage {
  async store(certificateId: string, pdfBuffer: Buffer): Promise<CertStorageResult> {
    await fs.promises.mkdir(LOCAL_OUTPUT_DIR, { recursive: true });

    const filePath = path.join(LOCAL_OUTPUT_DIR, `${certificateId}.pdf`);
    await fs.promises.writeFile(filePath, pdfBuffer);

    return { pdfUrl: `${LOCAL_API_PREFIX}/${certificateId}/file` };
  }

  /**
   * Resolve the filesystem path for a given certificate ID.
   * Used by the streaming route in CertificatesController.
   */
  getFilePath(certificateId: string): string {
    return path.join(LOCAL_OUTPUT_DIR, `${certificateId}.pdf`);
  }
}

// ---------------------------------------------------------------------------
// Cloud implementation stub — TODO: implement S3/R2/Supabase upload
// ---------------------------------------------------------------------------

export class CloudCertStorage implements ICertStorage {
  async store(_certificateId: string, _pdfBuffer: Buffer): Promise<CertStorageResult> {
    // TODO: implement S3 upload
    //
    // Example using @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner:
    //
    //   const s3 = new S3Client({ region: process.env.AWS_REGION });
    //   const key = `certificates/${_certificateId}.pdf`;
    //   await s3.send(new PutObjectCommand({
    //     Bucket: process.env.CERT_S3_BUCKET!,
    //     Key: key,
    //     Body: _pdfBuffer,
    //     ContentType: 'application/pdf',
    //   }));
    //   const pdfUrl = await getSignedUrl(s3, new GetObjectCommand({
    //     Bucket: process.env.CERT_S3_BUCKET!,
    //     Key: key,
    //   }), { expiresIn: 3600 });
    //   return { pdfUrl };
    //
    throw new Error(
      'CloudCertStorage is not yet implemented. ' +
        'Set CERT_STORAGE_PROVIDER=local for development, ' +
        'or implement the S3/R2/Supabase upload logic above.',
    );
  }
}

// ---------------------------------------------------------------------------
// Factory — swap to CloudCertStorage when deploying to production
// ---------------------------------------------------------------------------

export function createCertStorage(): ICertStorage {
  const provider = process.env['CERT_STORAGE_PROVIDER'] ?? 'local';
  if (provider === 'cloud') {
    return new CloudCertStorage();
  }
  return new LocalFsCertStorage();
}

/** Default export for convenience import in the module / worker. */
export const certStorage: ICertStorage = createCertStorage();
