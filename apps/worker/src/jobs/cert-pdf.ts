/**
 * cert-pdf job handler.
 *
 * Loads the Certificate row (with user, learningPath, and organisation),
 * generates the PDF via pdfkit, uploads it to Supabase Storage (or local fs
 * in stub mode), updates the Certificate row with storagePath + signed pdfUrl,
 * and writes an audit log entry.
 *
 * Returns: { pdfUrl, storagePath }
 */

import type { Job } from 'bullmq';
import type { CertPdfInput, CertPdfOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import { logger } from '../logger.js';
import { generateCertificatePdf } from '../cert/pdf.js';
import { writeCertPdf } from '../cert/storage.js';

export async function handleCertPdf(job: Job<CertPdfInput>): Promise<CertPdfOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const { certificateId } = job.data;

  log.info('cert-pdf: starting', { certificateId });
  const start = Date.now();

  // -------------------------------------------------------------------------
  // Load Certificate with relations
  // -------------------------------------------------------------------------
  const cert = await prisma.certificate.findUniqueOrThrow({
    where: { id: certificateId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          organizationId: true,
        },
      },
      learningPath: {
        select: {
          title: true,
        },
      },
    },
  });

  // Load organisation name separately (Certificate → User → Organization)
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: cert.user.organizationId },
    select: { name: true },
  });

  // -------------------------------------------------------------------------
  // Generate PDF
  // -------------------------------------------------------------------------
  const verifyCode = cert.signedHash.slice(0, 12).toUpperCase();

  const pdfBuffer = await generateCertificatePdf({
    certificateId: cert.id,
    userName: cert.user.name,
    learningPathTitle: cert.learningPath.title,
    organizationName: org.name,
    issuedAt: cert.issuedAt,
    verifyCode,
  });

  log.debug('cert-pdf: pdf generated', {
    certificateId,
    byteLength: pdfBuffer.byteLength,
  });

  // -------------------------------------------------------------------------
  // Upload (Supabase Storage in real mode, local fs in stub mode)
  // -------------------------------------------------------------------------
  const { storagePath, signedUrl } = await writeCertPdf(
    cert.user.organizationId,
    certificateId,
    pdfBuffer,
  );

  // -------------------------------------------------------------------------
  // Update Certificate row
  // -------------------------------------------------------------------------
  await prisma.certificate.update({
    where: { id: certificateId },
    data: {
      storagePath,
      pdfUrl: signedUrl,
    },
  });

  // -------------------------------------------------------------------------
  // Audit log
  // -------------------------------------------------------------------------
  await prisma.auditLog.create({
    data: {
      organizationId: cert.user.organizationId,
      actorId: null,
      action: 'certificate.pdf_generated',
      targetType: 'Certificate',
      targetId: certificateId,
      metadata: {
        storagePath,
        userId: cert.user.id,
        learningPathTitle: cert.learningPath.title,
        durationMs: Date.now() - start,
      },
    },
  });

  const durationMs = Date.now() - start;
  log.info('cert-pdf: completed', { certificateId, storagePath, durationMs });

  return { pdfUrl: signedUrl };
}
