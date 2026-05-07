/**
 * Policy file storage helpers.
 *
 * Object key convention: "<orgId>/<policyVersionId>__<safeName>" inside the
 * `policy-files` bucket. Sanitised filename keeps the original extension
 * for browser content-type inference when the signed URL is opened directly.
 */

import { storageConfig, isStubMode } from './config';
import { getSupabase } from './client';
import { stubUploadPolicyFile, stubGetPolicyFileSignedUrl } from './stub';

export interface PolicyUploadResult {
  storagePath: string;
  signedUrl: string;
}

/** 1 hour — policy file URLs are minted on read and short-lived. */
const DEFAULT_POLICY_TTL_SECONDS = 3600;

function sanitiseFilename(originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Defence-in-depth: never let `..` or absolute path attempts through.
  return safe.replace(/\.{2,}/g, '.').replace(/^[/_.-]+/, '') || 'file';
}

function inferContentType(originalName: string): string {
  const ext = originalName.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    default:
      return 'application/octet-stream';
  }
}

export async function uploadPolicyFile(
  orgId: string,
  policyVersionId: string,
  buffer: Buffer,
  originalName: string,
): Promise<PolicyUploadResult> {
  const safeName = sanitiseFilename(originalName);

  if (isStubMode()) {
    return stubUploadPolicyFile(orgId, policyVersionId, buffer, safeName);
  }

  const supabase = getSupabase();
  const storagePath = `${orgId}/${policyVersionId}__${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(storageConfig.policyFilesBucket)
    .upload(storagePath, buffer, {
      contentType: inferContentType(originalName),
      upsert: true,
    });
  if (uploadError) {
    throw new Error(
      `[storage] failed to upload policy file ${policyVersionId}: ${uploadError.message}`,
    );
  }

  const signedUrl = await mintPolicyFileSignedUrl(storagePath, DEFAULT_POLICY_TTL_SECONDS);
  return { storagePath, signedUrl };
}

export async function getPolicyFileSignedUrl(
  storagePath: string,
  ttlSeconds: number = DEFAULT_POLICY_TTL_SECONDS,
): Promise<string> {
  if (isStubMode()) {
    return stubGetPolicyFileSignedUrl(storagePath);
  }
  return mintPolicyFileSignedUrl(storagePath, ttlSeconds);
}

async function mintPolicyFileSignedUrl(storagePath: string, ttlSeconds: number): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(storageConfig.policyFilesBucket)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(
      `[storage] failed to sign policy file URL for ${storagePath}: ${
        error?.message ?? 'unknown error'
      }`,
    );
  }
  return data.signedUrl;
}
