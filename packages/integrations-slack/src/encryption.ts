/**
 * AES-256-GCM symmetric encryption for OAuth tokens at rest.
 *
 * Wire format: `${iv_base64}:${ciphertext_base64}:${authTag_base64}`
 *
 * Key derivation
 * --------------
 * The key comes from `process.env.INTEGRATION_ENCRYPTION_KEY`, which must be a
 * base64-encoded 32-byte (256-bit) value.
 *
 * Stub-mode behaviour: in development, when the env var is unset OR begins
 * with `PLACEHOLDER_`, we derive a fixed dev key from a constant seed and log
 * a single warning at first use. This lets local devs round-trip encrypt/
 * decrypt without manual key generation, while making the degraded mode
 * obvious.
 *
 * Production safety: when `NODE_ENV === 'production'` the first use throws if
 * the env var is missing or a placeholder — we never want a prod deployment
 * to encrypt with a deterministic dev key.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce size
const KEY_BYTES = 32; // 256-bit
const AUTH_TAG_BYTES = 16;

const PLACEHOLDER_PREFIX = 'PLACEHOLDER_';
const DEV_KEY_SEED = 'levelup-integration-dev-key-do-not-use-in-prod';

let warned = false;
let cachedKey: Buffer | null = null;

function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

function deriveDevKey(): Buffer {
  // Deterministic 32-byte key derived from a constant seed string. SHA-256 is
  // not a KDF, but it's adequate for an obvious dev fallback that we never
  // ship to production (guarded above).
  return createHash('sha256').update(DEV_KEY_SEED).digest();
}

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env['INTEGRATION_ENCRYPTION_KEY'] ?? '';

  if (!raw || raw.startsWith(PLACEHOLDER_PREFIX)) {
    if (isProduction()) {
      throw new Error(
        'INTEGRATION_ENCRYPTION_KEY is missing or a PLACEHOLDER_ value in production. ' +
          'Generate one with: `openssl rand -base64 32` and set it before booting.',
      );
    }
    if (!warned) {
      console.warn(
        '[@levelup/integrations-slack] STUB MODE — INTEGRATION_ENCRYPTION_KEY ' +
          'is missing or a PLACEHOLDER_ value. Using a fixed dev key derived ' +
          'from a constant seed. NEVER use this in production.',
      );
      warned = true;
    }
    cachedKey = deriveDevKey();
    return cachedKey;
  }

  // Production / real-key path: must be base64 of exactly 32 bytes.
  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length !== KEY_BYTES) {
    throw new Error(
      `INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte value (got ${decoded.length} bytes).`,
    );
  }

  cachedKey = decoded;
  return cachedKey;
}

/**
 * Encrypt a UTF-8 plaintext with AES-256-GCM and return the canonical wire
 * format (`iv:ciphertext:authTag`, all base64).
 */
export function encrypt(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), encrypted.toString('base64'), authTag.toString('base64')].join(
    ':',
  );
}

/**
 * Decrypt a blob produced by `encrypt()`. Throws on:
 *   - malformed wire format (wrong number of segments / wrong sizes)
 *   - auth tag mismatch (tampered ciphertext or wrong key)
 */
export function decrypt(blob: string): string {
  const parts = blob.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted blob: expected `iv:ciphertext:authTag` triple.');
  }
  const [ivStr, ctStr, tagStr] = parts as [string, string, string];

  const iv = Buffer.from(ivStr, 'base64');
  const ciphertext = Buffer.from(ctStr, 'base64');
  const authTag = Buffer.from(tagStr, 'base64');

  if (iv.length !== IV_BYTES) {
    throw new Error(`Invalid IV length (expected ${IV_BYTES} bytes, got ${iv.length}).`);
  }
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error(
      `Invalid auth tag length (expected ${AUTH_TAG_BYTES} bytes, got ${authTag.length}).`,
    );
  }

  const key = loadKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Test-only helper to reset cached key state. Used by integration tests that
 * mutate INTEGRATION_ENCRYPTION_KEY mid-suite. Not intended for runtime use.
 */
export function _resetEncryptionForTests(): void {
  cachedKey = null;
  warned = false;
}
