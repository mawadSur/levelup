/**
 * Governance evidence-report PDF storage helpers.
 *
 * Object key convention: "<orgId>/<reportId>.pdf" inside the
 * `governance-reports` bucket. Mirrors the certificates layout: orgId prefix
 * for cheap per-tenant isolation, signed URL for download.
 *
 * Stub mode falls back to writing into `<governanceOutputDir>/<orgId>/<reportId>.pdf`
 * so dev workflows work end-to-end without a Supabase project.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { storageConfig, isStubMode } from './config';
import { getSupabase } from './client';

export interface GovernanceReportUploadResult {
  storagePath: string;
  signedUrl: string;
}

/** 30 days — governance reports have a longer review tail than certs. */
const DEFAULT_REPORT_TTL_SECONDS = 30 * 24 * 3600;

export async function uploadGovernanceReport(
  orgId: string,
  reportId: string,
  buffer: Buffer,
): Promise<GovernanceReportUploadResult> {
  if (isStubMode()) {
    const orgDir = path.join(storageConfig.governanceOutputDir, orgId);
    await fs.promises.mkdir(orgDir, { recursive: true });
    const filePath = path.join(orgDir, `${reportId}.pdf`);
    await fs.promises.writeFile(filePath, buffer);
    return {
      storagePath: `${orgId}/${reportId}.pdf`,
      signedUrl: `file://${filePath}`,
    };
  }

  const supabase = getSupabase();
  const storagePath = `${orgId}/${reportId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(storageConfig.governanceReportsBucket)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (uploadError) {
    throw new Error(
      `[storage] failed to upload governance report ${reportId}: ${uploadError.message}`,
    );
  }

  const signedUrl = await mintGovernanceReportSignedUrl(storagePath, DEFAULT_REPORT_TTL_SECONDS);
  return { storagePath, signedUrl };
}

export async function getGovernanceReportSignedUrl(
  storagePath: string,
  ttlSeconds: number = DEFAULT_REPORT_TTL_SECONDS,
): Promise<string> {
  if (isStubMode()) {
    return `file://${path.join(storageConfig.governanceOutputDir, storagePath)}`;
  }
  return mintGovernanceReportSignedUrl(storagePath, ttlSeconds);
}

async function mintGovernanceReportSignedUrl(
  storagePath: string,
  ttlSeconds: number,
): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(storageConfig.governanceReportsBucket)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(
      `[storage] failed to sign governance report URL for ${storagePath}: ${
        error?.message ?? 'unknown error'
      }`,
    );
  }
  return data.signedUrl;
}
