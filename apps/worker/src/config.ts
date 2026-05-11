/**
 * Worker process configuration — reads from environment variables.
 *
 * All reads happen once at startup; no lazy access.
 */

import path from 'node:path';

// ---------------------------------------------------------------------------
// Redis (delegated to @levelup/queue which reads REDIS_URL)
// REDIS_URL is read by packages/queue/src/config.ts — no need to re-read here.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

const PLACEHOLDER_PREFIX = 'PLACEHOLDER_';

const rawResendKey = process.env['RESEND_API_KEY'] ?? '';

/** True when RESEND_API_KEY is missing or a PLACEHOLDER_ value. */
export const isEmailStubMode: boolean =
  !rawResendKey || rawResendKey.startsWith(PLACEHOLDER_PREFIX);

/** Real API key (only use after confirming !isEmailStubMode). */
export const resendApiKey: string = rawResendKey;

/** The "from" address used for all outgoing emails. */
const defaultEmailFrom =
  (process.env['CLIENT'] ?? '').toLowerCase() === 'kapitus'
    ? 'Kapitus AI Academy <noreply@levelupai.academy>'
    : 'LevelUp AI Academy <noreply@levelupai.academy>';
export const emailFrom: string = process.env['EMAIL_FROM'] ?? defaultEmailFrom;

/** Public app URL used to build links in email bodies. */
export const appUrl: string = process.env['APP_URL'] ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// White-label client (drives email branding + cert PDF look)
// ---------------------------------------------------------------------------

/** Active client key. Lowercase. `kapitus` for the Kapitus build, empty otherwise. */
export const client: 'kapitus' | '' =
  (process.env['CLIENT'] ?? '').toLowerCase() === 'kapitus' ? 'kapitus' : '';

/** Display name used in subject lines, footers, and the wordmark band. */
export const academyName: string =
  client === 'kapitus' ? 'Kapitus AI Academy' : 'LevelUp AI Academy';

// ---------------------------------------------------------------------------
// Worker concurrency (env-overridable)
// ---------------------------------------------------------------------------

function parseConcurrency(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 1 ? fallback : n;
}

export const concurrency = {
  certPdf: parseConcurrency('WORKER_CONCURRENCY_CERT_PDF', 2),
  reportAggregate: parseConcurrency('WORKER_CONCURRENCY_REPORT_AGGREGATE', 2),
  embedContent: parseConcurrency('WORKER_CONCURRENCY_EMBED_CONTENT', 2),
  sendEmail: parseConcurrency('WORKER_CONCURRENCY_SEND_EMAIL', 2),
  dataExport: parseConcurrency('WORKER_CONCURRENCY_DATA_EXPORT', 2),
  // Path generation makes a single LLM call per job. Default to 2 so a slow
  // OpenAI response doesn't starve unrelated traffic; operators can crank it
  // up if they're OK paying for parallel curriculum generation.
  pathGeneration: parseConcurrency('WORKER_CONCURRENCY_PATH_GENERATION', 2),
} as const;

// ---------------------------------------------------------------------------
// Output directories
// ---------------------------------------------------------------------------

/** Root of the repo — two levels up from apps/worker. */
const repoRoot = path.resolve(__dirname, '..', '..', '..');

/** Where generated certificate PDFs are written. */
export const certOutputDir: string =
  process.env['CERT_OUTPUT_DIR'] ?? path.join(repoRoot, 'apps', 'api', '.cert-output');

/** Where stub email .eml files are written. */
export const emailOutboxDir: string =
  process.env['EMAIL_OUTBOX_DIR'] ?? path.join(repoRoot, 'apps', 'api', '.outbox');

/** Where data export zip files are written (read by the API's download endpoint). */
export const exportsOutputDir: string =
  process.env['EXPORTS_OUTPUT_DIR'] ?? path.join(repoRoot, 'apps', 'api', '.exports');

/** Worker concurrency for data-export jobs. */
