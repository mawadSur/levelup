/**
 * Governance evidence-report PDF generator.
 *
 * Mirrors the visual treatment of the certificate PDF (brand blue/gold, mono
 * status footer) but uses a portrait letter page so we can stack four
 * sections — posture, dept risk table, top-categories, training paths — on a
 * single page suitable for board / SOC-2 evidence binders.
 *
 * Architectural note: this is the same `pdfkit` toolchain used in cert/pdf.ts;
 * keeping the worker's PDF surface in one library keeps the Docker image lean.
 */

import PDFDocument from 'pdfkit';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GovernanceReportData {
  organizationName: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  windowDays: number;
  posture: {
    totalAiInteractions: number;
    sensitiveDataTriggers: number;
    highRiskUsers: number;
    policyCoveragePct: number;
  };
  deptRows: Array<{
    name: string;
    headcount: number;
    sessions: number;
    triggers: number;
  }>;
  triggerCategories: Array<{
    category: string;
    count: number;
  }>;
  paths: Array<{
    title: string;
    lessonCount: number;
  }>;
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 48;
const BRAND_BLUE = '#1E40AF';
const BRAND_GOLD = '#D97706';
const DARK_TEXT = '#111827';
const MID_TEXT = '#374151';
const MUTED_TEXT = '#6B7280';
const FAINT = '#E5E7EB';

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export function generateGovernanceReportPdf(data: GovernanceReportData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      layout: 'portrait',
      margin: 0,
      info: {
        Title: `AI Governance Report — ${data.organizationName}`,
        Author: 'LevelUp AI Academy',
        Subject: `Governance evidence for ${data.periodLabel}`,
        CreationDate: new Date(),
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Background + accent
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#FFFFFF');
    doc.rect(0, 0, 8, PAGE_HEIGHT).fill(BRAND_BLUE);
    doc.rect(MARGIN_X, 28, PAGE_WIDTH - MARGIN_X * 2, 2).fill(BRAND_GOLD);

    // Header band
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(BRAND_BLUE)
      .text('LEVELUP AI ACADEMY · GOVERNANCE BRIEF', MARGIN_X, 44, {
        characterSpacing: 1.6,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(DARK_TEXT)
      .text('AI Governance Report', MARGIN_X, 64);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(MUTED_TEXT)
      .text(`${data.organizationName} · ${data.periodLabel}`, MARGIN_X, 96);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED_TEXT)
      .text(
        `Period: ${formatDate(data.periodStart)} → ${formatDate(data.periodEnd)} · ${data.windowDays} days`,
        MARGIN_X,
        113,
      );

    let y = 142;

    // -----------------------------------------------------------------------
    // Section A — Posture KPIs
    // -----------------------------------------------------------------------
    y = sectionHeader(doc, 'I. POSTURE', y);
    const cardWidth = (PAGE_WIDTH - MARGIN_X * 2 - 12) / 4;
    const cards: Array<[string, string]> = [
      ['AI INTERACTIONS', String(data.posture.totalAiInteractions)],
      ['SENSITIVE TRIGGERS', String(data.posture.sensitiveDataTriggers)],
      ['HIGH-RISK USERS', String(data.posture.highRiskUsers)],
      ['POLICY COVERAGE', `${data.posture.policyCoveragePct}%`],
    ];
    cards.forEach((card, i) => {
      const cardX = MARGIN_X + i * (cardWidth + 4);
      doc.rect(cardX, y, cardWidth, 60).fillAndStroke('#F9FAFB', FAINT);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED_TEXT)
        .text(card[0], cardX + 8, y + 8, { width: cardWidth - 16, characterSpacing: 1 });
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(DARK_TEXT)
        .text(card[1], cardX + 8, y + 24, { width: cardWidth - 16 });
    });
    y += 78;

    // -----------------------------------------------------------------------
    // Section B — Risk by department
    // -----------------------------------------------------------------------
    y = sectionHeader(doc, 'II. RISK BY DEPARTMENT', y);
    if (data.deptRows.length === 0) {
      y = emptyLine(doc, 'No department activity in this period.', y);
    } else {
      // Header row
      doc.font('Helvetica-Bold').fontSize(8).fillColor(MID_TEXT);
      const colX = [MARGIN_X, MARGIN_X + 200, MARGIN_X + 290, MARGIN_X + 380, MARGIN_X + 470];
      const headers = ['DEPARTMENT', 'HEADCOUNT', 'SESSIONS', 'TRIGGERS', 'TRIGGER RATE'];
      headers.forEach((h, i) => doc.text(h, colX[i] ?? MARGIN_X, y, { characterSpacing: 0.8 }));
      y += 14;
      doc
        .moveTo(MARGIN_X, y)
        .lineTo(PAGE_WIDTH - MARGIN_X, y)
        .strokeColor(FAINT)
        .stroke();
      y += 4;

      doc.font('Helvetica').fontSize(9).fillColor(DARK_TEXT);
      for (const row of data.deptRows) {
        const rate =
          row.sessions === 0 ? '—' : `${((row.triggers / row.sessions) * 100).toFixed(1)}%`;
        const values = [
          row.name,
          String(row.headcount),
          String(row.sessions),
          String(row.triggers),
          rate,
        ];
        values.forEach((v, i) =>
          doc.text(v, colX[i] ?? MARGIN_X, y, { width: 180, ellipsis: true }),
        );
        y += 14;
        if (y > PAGE_HEIGHT - 200) break; // protect remaining sections
      }
      y += 8;
    }

    // -----------------------------------------------------------------------
    // Section C — Top trigger categories
    // -----------------------------------------------------------------------
    y = sectionHeader(doc, 'III. TOP TRIGGER CATEGORIES', y);
    if (data.triggerCategories.length === 0) {
      y = emptyLine(doc, 'No sensitive-data triggers in this period.', y);
    } else {
      const totalTriggers = data.triggerCategories.reduce((sum, t) => sum + t.count, 0);
      const maxCount = Math.max(...data.triggerCategories.map((t) => t.count));
      const barWidth = 280;
      doc.font('Helvetica').fontSize(9);
      for (const cat of data.triggerCategories) {
        const pct = totalTriggers === 0 ? 0 : Math.round((cat.count / totalTriggers) * 100);
        const w = maxCount === 0 ? 0 : (cat.count / maxCount) * barWidth;
        doc.fillColor(MID_TEXT).text(cat.category, MARGIN_X, y, { width: 160, ellipsis: true });
        doc.rect(MARGIN_X + 170, y, barWidth, 8).fillAndStroke(FAINT, FAINT);
        doc.rect(MARGIN_X + 170, y, w, 8).fill(BRAND_BLUE);
        doc
          .fillColor(DARK_TEXT)
          .text(`${cat.count} (${pct}%)`, MARGIN_X + 460, y - 1, { width: 80 });
        y += 18;
      }
      y += 4;
    }

    // -----------------------------------------------------------------------
    // Section D — Training paths
    // -----------------------------------------------------------------------
    y = sectionHeader(doc, 'IV. PUBLISHED TRAINING PATHS', y);
    if (data.paths.length === 0) {
      y = emptyLine(doc, 'No published learning paths.', y);
    } else {
      doc.font('Helvetica').fontSize(9);
      for (const p of data.paths) {
        doc.fillColor(DARK_TEXT).text(p.title, MARGIN_X, y, { width: 380, ellipsis: true });
        doc
          .fillColor(MUTED_TEXT)
          .text(`${p.lessonCount} lesson${p.lessonCount === 1 ? '' : 's'}`, MARGIN_X + 400, y, {
            width: 110,
          });
        y += 14;
        if (y > PAGE_HEIGHT - 90) break;
      }
    }

    // -----------------------------------------------------------------------
    // Footer
    // -----------------------------------------------------------------------
    doc
      .moveTo(MARGIN_X, PAGE_HEIGHT - 60)
      .lineTo(PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 60)
      .strokeColor(FAINT)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED_TEXT)
      .text(
        'Generated by LevelUp AI Academy · Governance Module · Source: AuditLog + AiCoachSession + UserProgress',
        MARGIN_X,
        PAGE_HEIGHT - 50,
        { width: PAGE_WIDTH - MARGIN_X * 2, characterSpacing: 0.4 },
      );
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(BRAND_BLUE)
      .text(
        `Issued ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        MARGIN_X,
        PAGE_HEIGHT - 34,
      );

    doc.end();
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sectionHeader(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND_BLUE).text(title, MARGIN_X, y, {
    characterSpacing: 1.2,
  });
  doc
    .moveTo(MARGIN_X, y + 14)
    .lineTo(PAGE_WIDTH - MARGIN_X, y + 14)
    .strokeColor(BRAND_GOLD)
    .lineWidth(1)
    .stroke();
  return y + 22;
}

function emptyLine(doc: PDFKit.PDFDocument, text: string, y: number): number {
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED_TEXT).text(text, MARGIN_X, y);
  return y + 22;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
