/**
 * Certificate PDF storage helpers.
 *
 * Object key convention: "<orgId>/<certId>.pdf" inside the `certificates`
 * bucket. The orgId prefix gives us cheap per-tenant isolation (and an
 * obvious shape for any future RLS / signed-URL token policy).
 */

import { storageConfig, isStubMode } from './config';
import { getSupabase } from './client';
import { stubUploadCertificatePdf, stubGetCertificateSignedUrl } from './stub';

export interface CertificateUploadResult {
  storagePath: string;
  signedUrl: string;
}

/** 7 days in seconds — chosen to outlive a typical email→click roundtrip. */
const DEFAULT_CERT_TTL_SECONDS = 7 * 24 * 3600;

export async function uploadCertificatePdf(
  orgId: string,
  certId: string,
  buffer: Buffer,
): Promise<CertificateUploadResult> {
  if (isStubMode()) {
    return stubUploadCertificatePdf(orgId, certId, buffer);
  }

  const supabase = getSupabase();
  const storagePath = `${orgId}/${certId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(storageConfig.certificatesBucket)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (uploadError) {
    throw new Error(`[storage] failed to upload certificate ${certId}: ${uploadError.message}`);
  }

  const signedUrl = await mintCertificateSignedUrl(storagePath, DEFAULT_CERT_TTL_SECONDS);
  return { storagePath, signedUrl };
}

export async function getCertificateSignedUrl(
  storagePath: string,
  ttlSeconds: number = DEFAULT_CERT_TTL_SECONDS,
): Promise<string> {
  if (isStubMode()) {
    return stubGetCertificateSignedUrl(storagePath);
  }
  return mintCertificateSignedUrl(storagePath, ttlSeconds);
}

async function mintCertificateSignedUrl(storagePath: string, ttlSeconds: number): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(storageConfig.certificatesBucket)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(
      `[storage] failed to sign certificate URL for ${storagePath}: ${
        error?.message ?? 'unknown error'
      }`,
    );
  }
  return data.signedUrl;
}
