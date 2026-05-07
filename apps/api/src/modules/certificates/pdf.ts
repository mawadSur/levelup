/**
 * PDF generation for LevelUp AI Academy certificates.
 *
 * Library choice: pdfkit ^0.15.1
 *   - Pure-Node, no binary / native deps, easy Buffer output.
 *   - Alternatives considered: Puppeteer (heavier, requires Chrome binary),
 *     jsPDF (browser-oriented), @react-pdf/renderer (JSX dep).
 *   - pdfkit produces a clean programmatic API suitable for a background worker
 *     and keeps the Docker image lean.
 *
 * This module is designed to be imported by the BullMQ cert-pdf worker
 * (`apps/worker/src/handlers/cert-pdf.handler.ts`) as well as by the local
 * streaming route in CertificatesController.
 *
 * Usage:
 *   import { generateCertificatePdf } from './pdf';
 *   const buffer = await generateCertificatePdf({ ... });
 *   await fs.promises.writeFile(outputPath, buffer);
 */

// ---------------------------------------------------------------------------
// Type-only import guard
//
// pdfkit is declared as a devDependency; at runtime in tests or environments
// where it hasn't been installed it may be absent.  We guard the import so
// the rest of the module can load without crashing.  Production deployments
// MUST have pdfkit installed — the guard will throw a clear error at call time
// rather than a cryptic MODULE_NOT_FOUND at load time.
// ---------------------------------------------------------------------------

export interface CertificatePdfInput {
  holderName: string;
  pathTitle: string;
  issuedAt: Date;
  signedHash: string;
  organizationName: string;
}

// ---------------------------------------------------------------------------
// Colours and layout constants
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 841.89; // A4 landscape points
const PAGE_HEIGHT = 595.28;
const MARGIN = 60;
const ACCENT_BLUE = '#1D4ED8';
const ACCENT_GOLD = '#D97706';
const BODY_DARK = '#1E293B';
const BODY_MID = '#475569';
const BODY_LIGHT = '#94A3B8';

const VERIFY_BASE = 'https://app.levelup.example/certificates/verify';

// ---------------------------------------------------------------------------
// generateCertificatePdf
// ---------------------------------------------------------------------------

/**
 * Generate a one-page A4 landscape certificate and return it as a Buffer.
 *
 * Throws if pdfkit is not installed.
 */
export async function generateCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  // Dynamic import so the module loads even when pdfkit is absent
  // (worker resolves it; API tests don't need to produce PDFs directly).
  type PDFKitDoc = InstanceType<typeof import('pdfkit')>;

  let PDFDocument: new (opts: object) => PDFKitDoc;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PDFDocument = require('pdfkit') as new (opts: object) => PDFKitDoc;
  } catch {
    throw new Error('pdfkit is not installed. Add it to dependencies: npm install pdfkit@^0.15.1');
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      layout: 'landscape',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: {
        Title: `Certificate of Completion — ${input.pathTitle}`,
        Author: 'LevelUp AI Academy',
        Subject: input.holderName,
        Keywords: 'certificate,ai,learning',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const contentWidth = PAGE_WIDTH - MARGIN * 2;

    // -----------------------------------------------------------------------
    // Background and border
    // -----------------------------------------------------------------------
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#FAFAFA');
    // Outer decorative border
    doc
      .rect(MARGIN / 2, MARGIN / 2, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN)
      .lineWidth(3)
      .strokeColor(ACCENT_GOLD)
      .stroke();
    // Inner thinner border
    doc
      .rect(MARGIN / 2 + 6, MARGIN / 2 + 6, PAGE_WIDTH - MARGIN - 12, PAGE_HEIGHT - MARGIN - 12)
      .lineWidth(1)
      .strokeColor(ACCENT_BLUE)
      .stroke();

    let y = MARGIN + 10;

    // -----------------------------------------------------------------------
    // Brand wordmark
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(ACCENT_BLUE)
      .text('LevelUp AI Academy', MARGIN, y, { align: 'center', width: contentWidth });

    y += 36;

    // -----------------------------------------------------------------------
    // "Certificate of Completion" heading
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(BODY_LIGHT)
      .text('C E R T I F I C A T E   O F   C O M P L E T I O N', MARGIN, y, {
        align: 'center',
        width: contentWidth,
        characterSpacing: 1,
      });

    // Decorative underline
    y += 22;
    const lineX = PAGE_WIDTH / 2 - 80;
    doc
      .moveTo(lineX, y)
      .lineTo(lineX + 160, y)
      .lineWidth(2)
      .strokeColor(ACCENT_GOLD)
      .stroke();

    y += 28;

    // -----------------------------------------------------------------------
    // "This is to certify that"
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(BODY_MID)
      .text('This is to certify that', MARGIN, y, { align: 'center', width: contentWidth });

    y += 26;

    // -----------------------------------------------------------------------
    // Holder name (large)
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica-Bold')
      .fontSize(32)
      .fillColor(BODY_DARK)
      .text(input.holderName, MARGIN, y, { align: 'center', width: contentWidth });

    y += 54;

    // -----------------------------------------------------------------------
    // "Has successfully completed"
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(BODY_MID)
      .text('has successfully completed', MARGIN, y, {
        align: 'center',
        width: contentWidth,
      });

    y += 26;

    // -----------------------------------------------------------------------
    // Path title
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(ACCENT_BLUE)
      .text(input.pathTitle, MARGIN, y, { align: 'center', width: contentWidth });

    y += 44;

    // -----------------------------------------------------------------------
    // Issued date
    // -----------------------------------------------------------------------
    const issuedDateStr = input.issuedAt.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(BODY_MID)
      .text(`Issued on ${issuedDateStr}`, MARGIN, y, { align: 'center', width: contentWidth });

    y += 22;

    // -----------------------------------------------------------------------
    // Organisation name
    // -----------------------------------------------------------------------
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(BODY_MID)
      .text(`by ${input.organizationName}`, MARGIN, y, { align: 'center', width: contentWidth });

    y += 32;

    // -----------------------------------------------------------------------
    // Verification URL
    //
    // `input.signedHash` is the keyed HMAC produced by `cert-signing.ts`
    // (see SEV-5). This module is intentionally signature-agnostic — it
    // only renders the value it's given. Do NOT re-derive a signature here.
    // -----------------------------------------------------------------------
    const verifyUrl = `${VERIFY_BASE}/${input.signedHash}`;
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(BODY_LIGHT)
      .text(`Verify at ${verifyUrl}`, MARGIN, y, { align: 'center', width: contentWidth });

    doc.end();
  });
}
