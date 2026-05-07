/**
 * @levelup/llm — classifySensitive unit tests
 *
 * These tests exercise the pure regex stage of classifySensitive.
 * The LLM stage (stage 2) is skipped in stub mode, which is forced here via
 * the OPENAI_API_KEY env variable.
 *
 * Run: pnpm --filter @levelup/llm test
 */

// Force stub mode before any module is imported so that isStubMode() === true
// throughout this test file. This also prevents the production-key check in
// config.ts from throwing.
process.env['OPENAI_API_KEY'] = 'PLACEHOLDER_test';
process.env['NODE_ENV'] = 'test';

import { describe, it, expect, beforeAll } from 'vitest';
import { classifySensitive } from './sensitive';

// ---- helpers ----------------------------------------------------------------

async function classify(text: string) {
  return classifySensitive(text);
}

// ---- suite ------------------------------------------------------------------

describe('classifySensitive — regex stage', () => {
  describe('SSN detection', () => {
    it('detects a valid SSN pattern (123-45-6789)', async () => {
      const result = await classify('My SSN is 123-45-6789');
      expect(result.triggered).toBe(true);
      expect(result.categories).toContain('pii');
    });

    it('does NOT flag a string without SSN format', async () => {
      const result = await classify('Account ID: 12345');
      // no SSN, no other sensitive pattern
      expect(result.triggered).toBe(false);
    });
  });

  describe('Credit card detection (Luhn check)', () => {
    it('detects a Luhn-valid Visa test card 4242424242424242', async () => {
      const result = await classify('Card number: 4242424242424242');
      expect(result.triggered).toBe(true);
      expect(result.categories).toContain('payment');
    });

    it('does NOT flag a 16-digit string that fails Luhn', async () => {
      // 4242424242424243 — last digit incremented, fails Luhn
      const result = await classify('Number: 4242424242424243');
      // Only credit card path is tested; if no other pattern fires, not triggered
      // NOTE: phone regex might fire on some digit strings, so we only assert
      // the payment category is absent.
      expect(result.categories).not.toContain('payment');
    });
  });

  describe('AWS access key detection', () => {
    it('detects an AWS access key ID', async () => {
      const result = await classify('AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE');
      expect(result.triggered).toBe(true);
      expect(result.categories).toContain('credentials');
    });

    it('does NOT flag a key that lacks the AKIA prefix', async () => {
      const result = await classify('key=BKIAIOSFODNN7EXAMPLE');
      expect(result.categories).not.toContain('credentials');
    });
  });

  describe('Generic sk-... API key detection', () => {
    it('detects a generic sk- secret key of sufficient length', async () => {
      const fake = 'sk-proj-' + 'a'.repeat(26);
      const result = await classify(`OPENAI_API_KEY=${fake}`);
      expect(result.triggered).toBe(true);
      expect(result.categories).toContain('credentials');
    });

    it('does NOT flag a short sk- string (< 20 chars after prefix)', async () => {
      const result = await classify('code sk-short');
      expect(result.categories).not.toContain('credentials');
    });
  });

  describe('Email detection (customer record heuristic)', () => {
    it('triggers for two or more emails in the same text', async () => {
      const result = await classify('alice@example.com and bob@example.com are both enrolled.');
      expect(result.triggered).toBe(true);
      expect(result.categories).toContain('customer_data');
    });

    it('triggers for a single email paired with a customer-record keyword', async () => {
      const result = await classify(
        'Customer: alice@example.com | account: 1234 | address: 10 Main St',
      );
      expect(result.triggered).toBe(true);
      expect(result.categories).toContain('customer_data');
    });

    it('does NOT flag a lone plain email with no customer-record keywords', async () => {
      const result = await classify('Please send feedback to support@levelup.ai');
      // single email, no record keywords → customer_data should not fire
      expect(result.categories).not.toContain('customer_data');
    });
  });

  describe('Clean input', () => {
    it('returns { triggered: false } for empty string', async () => {
      const result = await classify('');
      expect(result.triggered).toBe(false);
      expect(result.categories).toEqual([]);
    });

    it('returns { triggered: false } for benign text', async () => {
      const result = await classify('Hello, welcome to LevelUp AI Academy!');
      expect(result.triggered).toBe(false);
      expect(result.categories).toEqual([]);
    });
  });

  describe('categories are correctly populated', () => {
    it('populates multiple categories when multiple patterns fire', async () => {
      const text = 'SSN: 123-45-6789 and AKIAIOSFODNN7EXAMPLE was exposed.';
      const result = await classify(text);
      expect(result.triggered).toBe(true);
      expect(result.categories).toContain('pii');
      expect(result.categories).toContain('credentials');
    });

    it('dedups categories (same category, two patterns)', async () => {
      // Both SSN and phone are `pii` — should appear only once
      const text = 'SSN 123-45-6789 phone 555-123-4567';
      const result = await classify(text);
      expect(result.triggered).toBe(true);
      const piiCount = result.categories.filter((c) => c === 'pii').length;
      expect(piiCount).toBe(1);
    });
  });

  describe('Stub mode — LLM stage 2 is skipped', () => {
    it('returns triggered:false for benign text (LLM stage would also say false)', async () => {
      // In stub mode isStubMode() === true so the LLM call is never made.
      const result = await classify('just a normal sentence');
      expect(result.triggered).toBe(false);
    });

    it('still triggers on regex-detectable input even in stub mode', async () => {
      const result = await classify('AWS key: AKIAIOSFODNN7EXAMPLE');
      expect(result.triggered).toBe(true);
      // No LLM call needed — regex is sufficient and stub mode doesn't block regex
    });
  });
});

// ============================================================================
// Expanded patterns — credentials
// ============================================================================

describe('expanded patterns — credentials', () => {
  it('catches a PEM RSA private key block', async () => {
    const r = await classify(
      "Here's the key:\n-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAtest...",
    );
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a generic PEM private key (EC)', async () => {
    const r = await classify('-----BEGIN EC PRIVATE KEY-----\nbase64data');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches an OpenSSH private key header', async () => {
    const r = await classify('-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXkt...');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches an SSH RSA public key', async () => {
    const r = await classify(
      'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7qvxlkLtestKeyDataAbcDefGhiJklMnoPqrStuvWxyz== user@host',
    );
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches an SSH ed25519 public key', async () => {
    const r = await classify(
      'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITestKeyDataAbcDefGhiJklMnoPqrStuvWxyz user@host',
    );
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a JWT token (three base64url segments)', async () => {
    const r = await classify(
      'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    );
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a GitHub classic PAT (ghp_)', async () => {
    // exactly 36 alphanumeric chars after ghp_
    const pat = 'ghp_' + 'a'.repeat(36);
    const r = await classify(`token: ${pat}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a GitHub fine-grained PAT (github_pat_)', async () => {
    // 82 alphanumeric/underscore chars after "github_pat_"
    const token = 'github_pat_' + 'A'.repeat(40) + 'b'.repeat(42);
    const r = await classify(`pat=${token}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a GitHub OAuth token (gho_)', async () => {
    // exactly 36 alphanumeric chars after gho_
    const token = 'gho_' + 'a'.repeat(36);
    const r = await classify(`oauth_token=${token}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a Slack bot token (xoxb-)', async () => {
    const tok = 'xoxb-' + '1'.repeat(10) + '-' + 'a'.repeat(11) + '-xyz';
    const r = await classify(`SLACK_TOKEN=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a Slack user token (xoxp-)', async () => {
    const tok = 'xoxp-' + '9'.repeat(10) + '-' + 'a'.repeat(16);
    const r = await classify(`token=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches an Anthropic API key (sk-ant-)', async () => {
    const tok = 'sk-ant-api03-' + 'a'.repeat(26);
    const r = await classify(`ANTHROPIC_API_KEY=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches an OpenAI project key (sk-proj-)', async () => {
    const tok = 'sk-proj-' + 'A'.repeat(26) + 'a'.repeat(6);
    const r = await classify(`OPENAI_KEY=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a generic sk- key (no sub-prefix)', async () => {
    const tok = 'sk-' + 'a'.repeat(26) + '123456';
    const r = await classify(`api_key=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('does NOT flag a short sk- string', async () => {
    const r = await classify('status: sk-short');
    expect(r.categories).not.toContain('credentials');
  });

  it('catches a Google API key (AIza...)', async () => {
    const tok = 'AIza' + 'A'.repeat(35);
    const r = await classify(`GOOGLE_KEY=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a Google OAuth refresh token (1//...)', async () => {
    const tok = '1//' + '0g' + 'a'.repeat(40);
    const r = await classify(`refresh_token=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a Stripe live secret key (sk_live_)', async () => {
    const tok = 'sk_live_' + 'a'.repeat(24);
    const r = await classify(`STRIPE_SECRET=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a Stripe restricted live key (rk_live_)', async () => {
    const tok = 'rk_live_' + 'a'.repeat(29);
    const r = await classify(`key=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a Twilio Account SID (AC + 32 hex)', async () => {
    const sid = 'AC' + 'a'.repeat(32);
    const r = await classify(`TWILIO_SID=${sid}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a Twilio Auth Token (SK + 32 hex)', async () => {
    const tok = 'SK' + 'a'.repeat(32);
    const r = await classify(`TWILIO_TOKEN=${tok}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a SendGrid API key (SG.<22>.<43>)', async () => {
    // SG. + exactly 22 chars + . + exactly 43 chars
    const sgKey = 'SG.' + 'A'.repeat(22) + '.' + 'B'.repeat(43);
    const r = await classify(`SENDGRID_API_KEY=${sgKey}`);
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('catches a Bearer header token (long token)', async () => {
    const r = await classify('Authorization: Bearer eyabcdefghijklmnopqrstuvwxyz0123456789ABCDEF');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('credentials');
  });

  it('does NOT flag a short bearer token (under 32 chars)', async () => {
    const r = await classify('Authorization: Bearer shorttoken');
    expect(r.categories).not.toContain('credentials');
  });
});

// ============================================================================
// Expanded patterns — PII
// ============================================================================

describe('expanded patterns — pii', () => {
  it('catches a UK National Insurance number (no spaces)', async () => {
    const r = await classify('NI number: AB123456C');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('pii');
  });

  it('catches a UK National Insurance number (with spaces)', async () => {
    const r = await classify('NI: AB 12 34 56 D');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('pii');
  });
});

// ============================================================================
// Expanded patterns — anchored (passport, SWIFT/BIC, NHS)
// ============================================================================

describe('expanded patterns — anchored', () => {
  it('flags a passport number WHEN "passport" keyword is nearby', async () => {
    const r = await classify('my passport number is AB1234567');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('pii');
  });

  it('does NOT flag the same token WITHOUT a passport keyword nearby', async () => {
    // "AB1234567" without any passport-related keyword
    const r = await classify('order reference AB1234567 is being processed');
    expect(r.triggered).toBe(false);
  });

  it('flags a passport number with non-English keyword (passeport)', async () => {
    const r = await classify('numéro de passeport CD9876543 est valide');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('pii');
  });

  it('flags a passport number with German keyword (Reisepass)', async () => {
    const r = await classify('Reisepass-Nummer EF5551234 wurde gescannt');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('pii');
  });

  it('flags a SWIFT/BIC code WHEN "SWIFT" keyword is nearby', async () => {
    const r = await classify('Please use SWIFT code DEUTDEDB for the transfer');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('payment');
  });

  it('flags a BIC code WHEN "BIC" keyword is nearby', async () => {
    const r = await classify('bank BIC: BNPAFRPP');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('payment');
  });

  it('does NOT flag a BIC-shaped string WITHOUT a bank/BIC/SWIFT keyword', async () => {
    // "ABCDGB12" could look like a BIC but has no keyword anchor
    const r = await classify('reference code ABCDGB12 for your records');
    // Should not fire the anchored BIC pattern
    expect(r.categories).not.toContain('payment');
  });

  it('flags an NHS number WHEN "NHS" keyword is nearby', async () => {
    const r = await classify('NHS number: 943 476 5919');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('phi');
  });

  it('does NOT flag a phone-shaped number WITHOUT "NHS" keyword nearby', async () => {
    // "943 476 5919" without NHS keyword — should not fire phi (may fire pii/phone)
    const r = await classify('call me on 943 476 5919 anytime');
    expect(r.categories).not.toContain('phi');
  });
});

// ============================================================================
// Expanded patterns — PHI
// ============================================================================

describe('expanded patterns — phi', () => {
  it('catches a Medical Record Number (MRN: prefix)', async () => {
    const r = await classify('Patient MRN: A12345-B6 admitted today');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('phi');
  });

  it('catches a MRN with space separator', async () => {
    const r = await classify('MRN 987XYZ was updated in the system');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('phi');
  });
});

// ============================================================================
// Expanded patterns — customer_data
// ============================================================================

describe('expanded patterns — customer_data', () => {
  it('catches a customer_id field', async () => {
    const r = await classify('customer_id: cust-abc123de');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('customer_data');
  });

  it('catches a customerid= assignment', async () => {
    const r = await classify('customerid=usr-00112233');
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain('customer_data');
  });

  it('does NOT flag a short customer id value (< 8 chars)', async () => {
    const r = await classify('customer_id: abc123');
    expect(r.categories).not.toContain('customer_data');
  });
});

// ============================================================================
// Reason text — multi-pattern hits
// ============================================================================

describe('reason text', () => {
  it('reason includes the first matching pattern name', async () => {
    // exactly 36 alphanumeric chars after ghp_
    const pat = 'ghp_' + 'a'.repeat(36);
    const r = await classify(pat);
    expect(r.triggered).toBe(true);
    expect(r.reason).toMatch(/GitHub PAT/i);
  });

  it('reason lists multiple patterns when several fire', async () => {
    // exactly 36 alphanumeric chars after ghp_
    const pat = 'ghp_' + 'a'.repeat(36);
    const r = await classify(`SSN: 123-45-6789 and key ${pat}`);
    expect(r.triggered).toBe(true);
    // reason is joined; should contain both
    expect(r.reason).toMatch(/SSN/i);
    expect(r.reason).toMatch(/GitHub PAT/i);
  });
});
