/**
 * Slack inline DLP scanner.
 *
 * Wraps `classifySensitive` from `@levelup/llm` for the Slack message-event
 * pipeline. The scanner is intentionally a pure function so the surrounding
 * NestJS module can:
 *   - call it synchronously inside an `setImmediate`-deferred handler;
 *   - test it in isolation without touching Slack APIs;
 *   - swap it for a richer classifier later without touching the wire path.
 *
 * Severity model
 * --------------
 * `classifySensitive` returns a flat list of `SensitiveCategory` strings. For
 * Slack we need a coarser priority axis to drive UX (warn vs. open incident).
 * The mapping below mirrors the rest of the product:
 *
 *   credentials | phi | payment  → HIGH    (account/HIPAA/PCI exposure)
 *   pii                          → MEDIUM  (employee / generic PII)
 *   customer_data                → MEDIUM  (records cluster)
 *
 * A single text can hit multiple categories — the response carries the
 * maximum severity seen.
 */

import { classifySensitive } from '@levelup/llm';

export type SlackScanSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SlackScanResult {
  flagged: boolean;
  categories: string[];
  severity: SlackScanSeverity;
  /** Human-friendly summary of the strongest hit, surfaced in the ephemeral. */
  primaryReason?: string;
  /**
   * Best-effort rewrite hint shown to the user. Today this is rule-based
   * (redaction template); a future iteration may delegate to the coach.
   */
  suggestedRewrite?: string;
}

const HIGH_CATEGORIES: ReadonlySet<string> = new Set(['credentials', 'phi', 'payment']);

function severityFor(categories: string[]): SlackScanSeverity {
  if (categories.length === 0) return 'LOW';
  for (const c of categories) {
    if (HIGH_CATEGORIES.has(c)) return 'HIGH';
  }
  return 'MEDIUM';
}

function describePrimary(categories: string[], reason: string | undefined): string | undefined {
  if (reason && reason.length > 0) return reason;
  if (categories.length === 0) return undefined;
  const [first] = categories;
  return `Possible ${first?.replace('_', ' ')} detected.`;
}

function rewriteHint(categories: string[]): string | undefined {
  if (categories.length === 0) return undefined;
  if (categories.includes('credentials')) {
    return 'Replace the secret with a vault reference (e.g. `op://vault/item/field`) or rotate it now.';
  }
  if (categories.includes('phi')) {
    return 'Remove patient identifiers — use a case ID or anonymised reference instead.';
  }
  if (categories.includes('payment')) {
    return 'Strip card / account numbers — link to the secure payment portal record instead.';
  }
  if (categories.includes('customer_data')) {
    return 'Refer to the customer by ticket / account ID, not by name + email + record details.';
  }
  return 'Consider rewording without the identifier — use a reference or ID instead.';
}

/**
 * Run the DLP scanner against a single Slack message text.
 *
 * Pure async function — no Slack network calls, no side effects. Stub mode
 * is inherited from `classifySensitive`: when `OPENAI_API_KEY` is a
 * `PLACEHOLDER_*`, only the regex stage runs and the LLM stage is skipped.
 */
export async function scanIncomingMessage(text: string): Promise<SlackScanResult> {
  if (!text || text.trim().length === 0) {
    return { flagged: false, categories: [], severity: 'LOW' };
  }

  const result = await classifySensitive(text);
  if (!result.triggered) {
    return { flagged: false, categories: [], severity: 'LOW' };
  }

  const categories = result.categories.slice();
  const severity = severityFor(categories);
  const primaryReason = describePrimary(categories, result.reason);
  const suggestedRewrite = rewriteHint(categories);

  const out: SlackScanResult = {
    flagged: true,
    categories,
    severity,
  };
  if (primaryReason) out.primaryReason = primaryReason;
  if (suggestedRewrite) out.suggestedRewrite = suggestedRewrite;
  return out;
}
