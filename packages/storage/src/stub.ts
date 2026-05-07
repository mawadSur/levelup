/**
 * Local-filesystem stub for Supabase Storage.
 *
 * Mirrors the legacy on-disk layout so existing dev workflows keep working
 * when SUPABASE_SERVICE_ROLE_KEY is unset or PLACEHOLDER_…:
 *   - Certificates: <certOutputDir>/<certId>.pdf
 *   - Policy files: <policyOutputDir>/<orgId>/<policyVersionId>__<safeName>
 *
 * Returned signedUrl is a `file://` URL — callers that try to fetch it will
 * fail (intentional: this is dev-only), but the existing API streaming
 * route falls through to local fs read when storagePath looks local.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { storageConfig } from './config';

export interface StubUploadResult {
  storagePath: string;
  signedUrl: string;
}

export async function stubUploadCertificatePdf(
  orgId: string,
  certId: string,
  buffer: Buffer,
): Promise<StubUploadResult> {
  await fs.promises.mkdir(storageConfig.certOutputDir, { recursive: true });
  const filePath = path.join(storageConfig.certOutputDir, `${certId}.pdf`);
  await fs.promises.writeFile(filePath, buffer);
  // Use the same logical key shape as the real bucket so callers can store
  // and round-trip a single value through Certificate.storagePath.
  const storagePath = `${orgId}/${certId}.pdf`;
  return {
    storagePath,
    signedUrl: `file://${filePath}`,
  };
}

export function stubGetCertificateLocalFilePath(certId: string): string {
  return path.join(storageConfig.certOutputDir, `${certId}.pdf`);
}

export async function stubGetCertificateSignedUrl(storagePath: string): Promise<string> {
  // storagePath shape is "<orgId>/<certId>.pdf" — derive certId for the local path.
  const segments = storagePath.split('/');
  const last = segments[segments.length - 1] ?? storagePath;
  const certId = last.replace(/\.pdf$/, '');
  return `file://${path.join(storageConfig.certOutputDir, `${certId}.pdf`)}`;
}

export async function stubUploadPolicyFile(
  orgId: string,
  policyVersionId: string,
  buffer: Buffer,
  originalName: string,
): Promise<StubUploadResult> {
  const orgDir = path.join(storageConfig.policyOutputDir, orgId);
  await fs.promises.mkdir(orgDir, { recursive: true });
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${policyVersionId}__${safeName}`;
  const filePath = path.join(orgDir, fileName);
  await fs.promises.writeFile(filePath, buffer);
  const storagePath = `${orgId}/${fileName}`;
  return {
    storagePath,
    signedUrl: `file://${filePath}`,
  };
}

export async function stubGetPolicyFileSignedUrl(storagePath: string): Promise<string> {
  return `file://${path.join(storageConfig.policyOutputDir, storagePath)}`;
}
