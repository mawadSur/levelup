/**
 * Severity rule engine for the Incident workflow loop.
 *
 * Pure (no DB / network / LLM) function that converts a sensitive-data
 * classification result into an incident kind + severity + assigned
 * remediation lab slug.
 *
 * Decision table (highest-priority match wins):
 *
 *   ┌────────────────────────────────────────────┬───────────────────┬──────────┬──────────────┐
 *   │ Trigger                                    │ Kind              │ Severity │ Lab          │
 *   ├────────────────────────────────────────────┼───────────────────┼──────────┼──────────────┤
 *   │ SSN / PHI / credit-card                    │ SENSITIVE_DATA_…  │ CRITICAL │ pii-redaction│
 *   │ GitHub PAT / API keys / credentials        │ SENSITIVE_DATA_…  │ HIGH     │ pii-redaction│
 *   │ Ad-rule keywords ("best lawyer" / …)       │ AD_RULE_VIOLATION │ MEDIUM   │ legal-…      │
 *   │ Generic PII only                           │ — (no incident)   │ LOW      │ —            │
 *   └────────────────────────────────────────────┴───────────────────┴──────────┴──────────────┘
 *
 * `severity = LOW` returns `incident: null` — those events are audit-only and
 * never create an Incident row (the coach already logged the
 * `coach.sensitive_data_detected` audit entry).
 */

import type { SensitiveResult } from '@levelup/llm';
import { IncidentKind, IncidentSeverity } from '@levelup/db';

export interface IncidentClassification {
  kind: IncidentKind;
  severity: IncidentSeverity;
  /** Lab slug to assign for remediation. `null` when no remediation lab maps. */
  assignedLabSlug: string | null;
  /** Short reason string surfaced into Incident.signal and any CISO email. */
  reason: string;
}

/** Returns `null` for audit-only signals (no Incident row should be created). */
export function classifyIncidentSeverity(
  signal: SensitiveResult,
  /** The raw user input — checked for ad-rule keyword patterns the LLM classifier does not produce. */
  userInput?: string,
): IncidentClassification | null {
  if (!signal.triggered) return null;

  const reason = signal.reason ?? '';
  const categories = signal.categories;
  const lowerReason = reason.toLowerCase();
  const lowerInput = (userInput ?? '').toLowerCase();

  // CRITICAL — SSN, PHI, credit card / payment data.
  const isSsn = /\bssn\b|social security/.test(lowerReason);
  const isPhi = categories.includes('phi');
  const isPayment = categories.includes('payment') || /credit card|luhn|iban/.test(lowerReason);

  if (isSsn || isPhi || isPayment) {
    return {
      kind: IncidentKind.SENSITIVE_DATA_LEAK,
      severity: IncidentSeverity.CRITICAL,
      assignedLabSlug: 'pii-redaction',
      reason: reason || 'Critical sensitive data (SSN / PHI / payment) detected',
    };
  }

  // HIGH — credentials (GitHub PAT, API keys, AWS keys, JWTs, etc.).
  if (categories.includes('credentials')) {
    return {
      kind: IncidentKind.SENSITIVE_DATA_LEAK,
      severity: IncidentSeverity.HIGH,
      assignedLabSlug: 'pii-redaction',
      reason: reason || 'Credentials / API keys detected in user input',
    };
  }

  // MEDIUM — ad-rule violations (legal-marketing absolute claims).
  if (matchesAdRulePatterns(lowerInput)) {
    return {
      kind: IncidentKind.AD_RULE_VIOLATION,
      severity: IncidentSeverity.MEDIUM,
      assignedLabSlug: 'legal-marketing-geo-page',
      reason: 'Ad-rule violation pattern matched (absolute claim / superlative)',
    };
  }

  // LOW — generic PII categories with no specific high-severity trigger.
  // Audit-only — return null so no Incident row is created.
  if (categories.includes('pii') || categories.includes('customer_data')) {
    return null;
  }

  // Fallback: triggered but no specific category mapped — treat as audit-only.
  return null;
}

const AD_RULE_PATTERNS: RegExp[] = [
  /\bbest\s+(?:lawyer|attorney|doctor|dentist|surgeon|realtor)\b/,
  /\bguaranteed\s+(?:win|result|outcome|approval|return)\b/,
  /\b(?:#1|number\s+one)\s+(?:lawyer|attorney|doctor|firm)\b/,
  /\b(?:always|never)\s+(?:wins?|loses?)\b/,
  /\b100%\s+(?:guaranteed|success|win)\b/,
];

function matchesAdRulePatterns(lowerInput: string): boolean {
  if (lowerInput.length === 0) return false;
  return AD_RULE_PATTERNS.some((re) => re.test(lowerInput));
}
