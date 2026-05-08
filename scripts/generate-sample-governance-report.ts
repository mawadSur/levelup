/**
 * One-off sample-report generator for the marketing /governance page.
 *
 * Re-uses the worker's `generateGovernanceReportPdf` so the marketing artifact
 * matches what an actual customer would receive from the live job.
 *
 * Usage:
 *   pnpm tsx scripts/generate-sample-governance-report.ts
 *
 * Writes the binary to `apps/web/public/governance/sample-report.pdf`. Re-run
 * whenever the design changes.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateGovernanceReportPdf,
  type GovernanceReportData,
} from '../apps/worker/src/governance/pdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const periodEnd = new Date('2026-06-30T23:59:59Z');
const periodStart = new Date('2026-04-01T00:00:00Z');
const windowDays = 90;

const SAMPLE: GovernanceReportData = {
  organizationName: 'Acme Corp (sample)',
  periodLabel: 'Q2 2026',
  periodStart,
  periodEnd,
  windowDays,
  posture: {
    totalAiInteractions: 14_812,
    sensitiveDataTriggers: 142,
    highRiskUsers: 9,
    policyCoveragePct: 78,
  },
  deptRows: [
    { name: 'Engineering', headcount: 84, sessions: 6_212, triggers: 47 },
    { name: 'Sales', headcount: 56, sessions: 3_109, triggers: 31 },
    { name: 'Marketing', headcount: 32, sessions: 2_104, triggers: 22 },
    { name: 'Finance', headcount: 18, sessions: 821, triggers: 18 },
    { name: 'Customer Success', headcount: 28, sessions: 1_904, triggers: 14 },
    { name: 'People', headcount: 12, sessions: 412, triggers: 6 },
    { name: 'Legal', headcount: 6, sessions: 250, triggers: 4 },
  ],
  triggerCategories: [
    { category: 'CREDENTIALS', count: 48 },
    { category: 'PII', count: 39 },
    { category: 'INTERNAL_DATA', count: 27 },
    { category: 'FINANCIAL', count: 18 },
    { category: 'PHI', count: 6 },
    { category: 'OTHER', count: 4 },
  ],
  paths: [
    { title: 'AI Foundations · Safe Use', lessonCount: 8 },
    { title: 'Working with Customer Data', lessonCount: 6 },
    { title: 'Engineering with AI Assistants', lessonCount: 7 },
    { title: 'Finance Workflows with AI', lessonCount: 5 },
  ],
};

async function main() {
  const buffer = await generateGovernanceReportPdf(SAMPLE);
  const outPath = resolve(
    __dirname,
    '..',
    'apps',
    'web',
    'public',
    'governance',
    'sample-report.pdf',
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buffer);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${buffer.byteLength} bytes → ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
