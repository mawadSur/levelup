/**
 * Certificate PDF generator — pdfkit-based.
 *
 * Decision: This file lives in apps/worker/src/cert/pdf.ts and is the single
 * source of truth for PDF generation. The API's certificate controller should
 * NOT generate PDFs directly; instead it enqueues a cert-pdf job and streams
 * the resulting file from disk at GET /api/certificates/:id/file once the
 * worker has written it to apps/api/.cert-output/<id>.pdf.
 *
 * If a shared package is ever needed (e.g. @levelup/worker-cert), the
 * function can be moved there without changing the worker-side call-site.
 */

import PDFDocument from 'pdfkit';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CertificateData {
  certificateId: string;
  userName: string;
  learningPathTitle: string;
  organizationName: string;
  issuedAt: Date;
  /** Truncated hash displayed on the cert for independent verification. */
  verifyCode: string;
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 792; // US Letter landscape width in pts
const PAGE_HEIGHT = 612; // US Letter landscape height in pts

const BRAND_BLUE = '#1E40AF';
const BRAND_GOLD = '#D97706';
const DARK_TEXT = '#111827';
const MUTED_TEXT = '#6B7280';

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate a certificate PDF and return it as a Buffer.
 *
 * The returned Buffer can be written to disk, streamed to a client, or
 * uploaded to object storage.
 */
export function generateCertificatePdf(data: CertificateData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      layout: 'landscape',
      margin: 0,
      info: {
        Title: `Certificate — ${data.learningPathTitle}`,
        Author: 'LevelUp AI Academy',
        Subject: `Completion certificate for ${data.userName}`,
        CreationDate: data.issuedAt,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // -----------------------------------------------------------------------
    // Background
    // -----------------------------------------------------------------------
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#FFFFFF');

    // Left accent bar
    doc.rect(0, 0, 12, PAGE_HEIGHT).fill(BRAND_BLUE);

    // Top gold rule (below accent bar)
    doc.rect(28, 28, PAGE_WIDTH - 56, 3).fill(BRAND_GOLD);

    // Bottom gold rule
    doc.rect(28, PAGE_HEIGHT - 31, PAGE_WIDTH - 56, 3).fill(BRAND_GOLD);

    // Decorative corner boxes (top-right, bottom-left)
    doc.rect(PAGE_WIDTH - 44, 28, 16, 16).fill(BRAND_BLUE);
    doc.rect(28, PAGE_HEIGHT - 44, 16, 16).fill(BRAND_BLUE);

    // -----------------------------------------------------------------------
    // Academy name / header
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(BRAND_BLUE)
      .text('LEVELUP AI ACADEMY', 0, 55, {
        align: 'center',
        width: PAGE_WIDTH,
        characterSpacing: 3,
      });

    // -----------------------------------------------------------------------
    // "Certificate of Completion" title
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica-Bold')
      .fontSize(34)
      .fillColor(DARK_TEXT)
      .text('Certificate of Completion', 0, 100, {
        align: 'center',
        width: PAGE_WIDTH,
      });

    // Thin divider line below title
    doc
      .moveTo(PAGE_WIDTH / 2 - 120, 148)
      .lineTo(PAGE_WIDTH / 2 + 120, 148)
      .lineWidth(1)
      .strokeColor(BRAND_GOLD)
      .stroke();

    // -----------------------------------------------------------------------
    // "This is to certify that"
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica')
      .fontSize(13)
      .fillColor(MUTED_TEXT)
      .text('This is to certify that', 0, 168, {
        align: 'center',
        width: PAGE_WIDTH,
      });

    // -----------------------------------------------------------------------
    // Recipient name
    // -----------------------------------------------------------------------
    doc.font('Helvetica-Bold').fontSize(28).fillColor(BRAND_BLUE).text(data.userName, 0, 193, {
      align: 'center',
      width: PAGE_WIDTH,
    });

    // -----------------------------------------------------------------------
    // "has successfully completed"
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica')
      .fontSize(13)
      .fillColor(MUTED_TEXT)
      .text('has successfully completed', 0, 236, {
        align: 'center',
        width: PAGE_WIDTH,
      });

    // -----------------------------------------------------------------------
    // Course / path title
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(DARK_TEXT)
      .text(data.learningPathTitle, 60, 258, {
        align: 'center',
        width: PAGE_WIDTH - 120,
      });

    // -----------------------------------------------------------------------
    // Organisation
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(MUTED_TEXT)
      .text(`at ${data.organizationName}`, 0, 296, {
        align: 'center',
        width: PAGE_WIDTH,
      });

    // -----------------------------------------------------------------------
    // Issue date
    // -----------------------------------------------------------------------
    const issuedFormatted = data.issuedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(MUTED_TEXT)
      .text(`Issued on ${issuedFormatted}`, 0, 330, {
        align: 'center',
        width: PAGE_WIDTH,
      });

    // -----------------------------------------------------------------------
    // Verification code (bottom strip)
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED_TEXT)
      .text(
        `Verification code: ${data.verifyCode}  |  Issued by LevelUp AI Academy`,
        0,
        PAGE_HEIGHT - 25,
        {
          align: 'center',
          width: PAGE_WIDTH,
          characterSpacing: 0.5,
        },
      );

    doc.end();
  });
}
