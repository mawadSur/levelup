/**
 * Certificate PDF storage helpers.
 *
 * Object key convention: "<orgId>/<certId>.pdf" inside the `certificates`
 * bucket. The orgId prefix gives us cheap per-tenant isolation (and an
 * obvious shape for any future RLS / signed-URL token policy).
 *
 * Backend selection (CR.26):
 *   1. Cloudflare R2 — preferred when R2_* env vars are configured.
 *   2. Supabase Storage — fallback for environments still on the original setup.
 *   3. Local filesystem (stub) — when nothing is configured.
 *
 * The object-key shape is identical across all three backends so a single
 * `Certificate.storagePath` value round-trips through any of them.
 */

import { storageConfig, isStubMode, isR2Configured } from './config';
import { getSupabase } from './client';
import { uploadObject, getSignedDownloadUrl } from './r2-client';
import { stubUploadCertificatePdf, stubGetCertificateSignedUrl } from './stub';

export interface CertificateUploadResult {
  storagePath: string;
  signedUrl: string;
}

/** 15 minutes for R2 (matches the R2 client default). */
const R2_CERT_TTL_SECONDS = 15 * 60;
/** 7 days for Supabase — older fallback, kept for parity with shipped behaviour. */
const DEFAULT_CERT_TTL_SECONDS = 7 * 24 * 3600;

export async function uploadCertificatePdf(
  orgId: string,
  certId: string,
  buffer: Buffer,
): Promise<CertificateUploadResult> {
  const storagePath = `${orgId}/${certId}.pdf`;

  // R2 path takes priority when configured.
  if (isR2Configured()) {
    await uploadObject(storagePath, buffer, { contentType: 'application/pdf' });
    const signedUrl = await getSignedDownloadUrl(storagePath, R2_CERT_TTL_SECONDS);
    return { storagePath, signedUrl };
  }

  if (isStubMode()) {
    return stubUploadCertificatePdf(orgId, certId, buffer);
  }

  const supabase = getSupabase();
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
  if (isR2Configured()) {
    // Honour caller's TTL when explicit (defaults to 7d which is too long for
    // R2 presigned URLs — cap at 7d max, which is R2's hard ceiling).
    const ttl = Math.min(ttlSeconds, 7 * 24 * 3600);
    return getSignedDownloadUrl(storagePath, ttl);
  }
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
