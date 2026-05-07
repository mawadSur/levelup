import type { SensitiveCategory, SensitiveResult } from './types';
import { isStubMode, llmConfig } from './config';
import { getOpenAI } from './client';

// ---------------------------------------------------------------------------
// Compiled regex constants — each compiled ONCE at module load for O(n×k) perf
// ---------------------------------------------------------------------------

// ---- Stage-1 patterns (original) ------------------------------------------
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;
const AWS_KEY_RE = /\bAKIA[0-9A-Z]{16}\b/;
const PHONE_RE = /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/;
const IPV4_RE = /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/;
const US_PASSPORT_RE = /\b[A-Z]\d{8}\b/;
const EMAIL_DOMAIN_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const CREDIT_CANDIDATE_RE = /\b(?:\d[ -]?){12,18}\d\b/g;

// ---------------------------------------------------------------------------
// Structured pattern list — new expanded patterns
// ---------------------------------------------------------------------------

interface SensitivePattern {
  name: string;
  pattern: RegExp;
  category: SensitiveCategory;
  /** If set, the match is only flagged when one of these keywords appears within
   *  `anchorWindow` characters of the match index. */
  anchors?: string[];
  anchorWindow?: number;
}

// Default window size when anchors are specified
const DEFAULT_ANCHOR_WINDOW = 50;

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // -- credentials -----------------------------------------------------------
  {
    name: 'PEM private key',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    category: 'credentials',
  },
  {
    name: 'OpenSSH private key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/,
    category: 'credentials',
  },
  {
    name: 'SSH public key',
    pattern: /\b(ssh-(rsa|ed25519|ecdsa-[a-z0-9-]+))\s+[A-Za-z0-9+/=]{40,}/,
    category: 'credentials',
  },
  {
    name: 'JWT token',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    category: 'credentials',
  },
  {
    name: 'GitHub PAT (classic)',
    pattern: /\bghp_[A-Za-z0-9]{36}\b/,
    category: 'credentials',
  },
  {
    name: 'GitHub fine-grained PAT',
    pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/,
    category: 'credentials',
  },
  {
    name: 'GitHub OAuth token',
    pattern: /\bgho_[A-Za-z0-9]{36}\b/,
    category: 'credentials',
  },
  {
    name: 'Slack token',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
    category: 'credentials',
  },
  {
    name: 'Anthropic API key',
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/,
    category: 'credentials',
  },
  {
    // Replaces the original loose GENERIC_API_KEY_RE — more specific, still catches
    // OpenAI project keys (sk-proj-...) and generic sk-... tokens.
    // Stripe live keys (sk_live_...) are handled separately below.
    name: 'OpenAI / generic sk- API key',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9]{20,}\b/,
    category: 'credentials',
  },
  {
    name: 'Google API key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
    category: 'credentials',
  },
  {
    name: 'Google OAuth refresh token',
    pattern: /\b1\/\/[0-9A-Za-z_-]{40,}\b/,
    category: 'credentials',
  },
  {
    name: 'Stripe live secret key',
    pattern: /\bsk_live_[0-9a-zA-Z]{24,}\b/,
    category: 'credentials',
  },
  {
    name: 'Stripe restricted live key',
    pattern: /\brk_live_[0-9a-zA-Z]{24,}\b/,
    category: 'credentials',
  },
  {
    name: 'Twilio Account SID',
    pattern: /\bAC[a-f0-9]{32}\b/,
    category: 'credentials',
  },
  {
    name: 'Twilio Auth Token',
    pattern: /\bSK[a-f0-9]{32}\b/,
    category: 'credentials',
  },
  {
    name: 'SendGrid API key',
    pattern: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/,
    category: 'credentials',
  },
  {
    name: 'Bearer token',
    // case-insensitive flag on individual pattern; require 32+ char token to
    // reduce noise from short Authorization headers in example code
    pattern: /\bbearer\s+[A-Za-z0-9_\-.=]{32,}\b/i,
    category: 'credentials',
  },

  // -- pii -------------------------------------------------------------------
  {
    name: 'UK National Insurance number',
    pattern: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/,
    category: 'pii',
  },
  {
    name: 'Passport number (with keyword)',
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/,
    category: 'pii',
    anchors: ['passport', 'passeport', 'pasaporte', 'reisepass'],
    anchorWindow: 50,
  },

  // -- payment ---------------------------------------------------------------
  {
    name: 'SWIFT / BIC code',
    pattern: /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/,
    category: 'payment',
    anchors: ['bic', 'swift', 'bank'],
    anchorWindow: 30,
  },

  // -- phi -------------------------------------------------------------------
  {
    name: 'NHS number (with keyword)',
    pattern: /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/,
    category: 'phi',
    anchors: ['nhs'],
    anchorWindow: 30,
  },
  {
    name: 'Medical record number (MRN)',
    pattern: /\bMRN[:\s]+[A-Z0-9-]{6,}\b/,
    category: 'phi',
  },

  // -- customer_data ---------------------------------------------------------
  {
    name: 'Customer ID (keyword-anchored)',
    pattern: /\bcustomer[_-]?id[:\s=]+[A-Za-z0-9-]{8,}\b/i,
    category: 'customer_data',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function luhnCheck(raw: string): boolean {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    const ch = digits.charAt(i);
    let n = ch.charCodeAt(0) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectCreditCard(text: string): boolean {
  const matches = text.match(CREDIT_CANDIDATE_RE);
  if (!matches) return false;
  for (const m of matches) {
    if (luhnCheck(m)) return true;
  }
  return false;
}

function detectCustomerEmailCluster(text: string): boolean {
  const matches = text.match(EMAIL_DOMAIN_RE);
  if (!matches || matches.length === 0) return false;
  // Heuristic: 2+ emails, OR a single email accompanied by what looks like a
  // customer record (name + phone or address keywords).
  if (matches.length >= 2) return true;
  const looksLikeRecord = /\b(?:customer|client|account|order|invoice|address|dob|ssn)\b/i.test(
    text,
  );
  return looksLikeRecord;
}

/**
 * Returns true when at least one of the `keywords` appears within `window`
 * characters of `matchIndex` in `text` (case-insensitive).
 */
function hasKeywordWithin(
  text: string,
  matchIndex: number,
  keywords: string[],
  window: number = DEFAULT_ANCHOR_WINDOW,
): boolean {
  const start = Math.max(0, matchIndex - window);
  const end = Math.min(text.length, matchIndex + window);
  const haystack = text.slice(start, end).toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

// ---------------------------------------------------------------------------
// Hit types
// ---------------------------------------------------------------------------

interface RegexHit {
  category: SensitiveCategory;
  reason: string;
}

// ---------------------------------------------------------------------------
// Stage-1 regex pass
// ---------------------------------------------------------------------------

function regexStage(text: string): RegexHit[] {
  const hits: RegexHit[] = [];

  // --- original hand-rolled detections (kept intact) -----------------------
  if (SSN_RE.test(text)) hits.push({ category: 'pii', reason: 'US SSN pattern detected.' });
  if (detectCreditCard(text))
    hits.push({ category: 'payment', reason: 'Luhn-valid credit card number detected.' });
  if (AWS_KEY_RE.test(text))
    hits.push({ category: 'credentials', reason: 'AWS access key ID pattern detected.' });
  if (PHONE_RE.test(text)) hits.push({ category: 'pii', reason: 'Phone number pattern detected.' });
  if (IPV4_RE.test(text)) hits.push({ category: 'pii', reason: 'IPv4 address pattern detected.' });
  if (IBAN_RE.test(text)) hits.push({ category: 'payment', reason: 'IBAN pattern detected.' });
  if (US_PASSPORT_RE.test(text))
    hits.push({ category: 'pii', reason: 'US passport number pattern detected.' });
  if (detectCustomerEmailCluster(text))
    hits.push({
      category: 'customer_data',
      reason: 'Customer-record-like email cluster detected.',
    });

  // --- structured pattern loop (expanded patterns) -------------------------
  for (const sp of SENSITIVE_PATTERNS) {
    // Reset lastIndex for global/sticky regexes (none here, but be defensive)
    sp.pattern.lastIndex = 0;
    const m = sp.pattern.exec(text);
    if (!m) continue;

    if (sp.anchors && sp.anchors.length > 0) {
      const window = sp.anchorWindow ?? DEFAULT_ANCHOR_WINDOW;
      if (!hasKeywordWithin(text, m.index, sp.anchors, window)) continue;
    }

    hits.push({ category: sp.category, reason: `${sp.name} detected.` });
  }

  return hits;
}

function dedupeCategories(hits: RegexHit[]): SensitiveCategory[] {
  const seen = new Set<SensitiveCategory>();
  for (const h of hits) seen.add(h.category);
  return Array.from(seen);
}

// ---------------------------------------------------------------------------
// Stage-2 LLM pass (unchanged)
// ---------------------------------------------------------------------------

interface LlmStageResponse {
  triggered: boolean;
  categories?: SensitiveCategory[];
  reason?: string;
}

async function llmStage(text: string): Promise<SensitiveResult> {
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['triggered', 'categories'],
    properties: {
      triggered: { type: 'boolean' },
      categories: {
        type: 'array',
        items: { enum: ['pii', 'phi', 'payment', 'credentials', 'customer_data'] },
      },
      reason: { type: 'string' },
    },
  } as const;

  const body = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system' as const,
        content:
          'You are a data-loss-prevention classifier. Given a piece of text, decide whether it appears to contain confidential customer data, PHI, employee PII, or secrets. Be precise: do not flag generic mentions. Respond with JSON only.',
      },
      {
        role: 'user' as const,
        content: text.slice(0, 4000),
      },
    ],
    temperature: 0,
    response_format: {
      type: 'json_schema' as const,
      json_schema: { name: 'SensitiveCheck', schema, strict: true },
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    const openai = getOpenAI();
    const resp = (await openai.chat.completions.create(
      body as unknown as Parameters<typeof openai.chat.completions.create>[0],
      { signal: controller.signal },
    )) as unknown as { choices?: Array<{ message?: { content?: string | null } }> };
    const raw = resp.choices?.[0]?.message?.content ?? '';
    let parsed: LlmStageResponse;
    try {
      parsed = JSON.parse(raw) as LlmStageResponse;
    } catch {
      return { triggered: false, categories: [] };
    }
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const result: SensitiveResult = {
      triggered: Boolean(parsed.triggered),
      categories,
    };
    if (parsed.reason) result.reason = parsed.reason;
    return result;
  } catch (err: unknown) {
    console.warn(
      '[@levelup/llm] sensitive LLM stage failed or timed out, defaulting to not-triggered',
      {
        message: err instanceof Error ? err.message : String(err),
      },
    );
    return { triggered: false, categories: [] };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function classifySensitive(text: string): Promise<SensitiveResult> {
  if (!text || text.trim().length === 0) {
    return { triggered: false, categories: [] };
  }

  const hits = regexStage(text);
  if (hits.length > 0) {
    const reason = hits.map((h) => h.reason).join(' ');
    return {
      triggered: true,
      categories: dedupeCategories(hits),
      reason,
    };
  }

  if (isStubMode()) return { triggered: false, categories: [] };
  if (!llmConfig.llmSensitiveCheck) return { triggered: false, categories: [] };

  return llmStage(text);
}
