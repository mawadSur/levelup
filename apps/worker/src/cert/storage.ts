/**
 * Certificate PDF storage — uploads to Supabase Storage (real mode) or
 * writes to apps/api/.cert-output/<id>.pdf (stub mode).
 *
 * Returns both the storage object key (persisted as Certificate.storagePath)
 * and a freshly-minted signed URL (persisted as Certificate.pdfUrl so existing
 * consumers that only know about pdfUrl keep working).
 */

import { uploadCertificatePdf } from '@levelup/storage';

export interface CertPdfStored {
  storagePath: string;
  signedUrl: string;
}

export async function writeCertPdf(
  organizationId: string,
  certificateId: string,
  buffer: Buffer,
): Promise<CertPdfStored> {
  return uploadCertificatePdf(organizationId, certificateId, buffer);
}
