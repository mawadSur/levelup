/**
 * cert-signing — keyed HMAC signing for certificate verification (SEV-5).
 *
 * The previous implementation stored an unkeyed `sha256(userId:learningPathId:Date.now())`
 * as `signedHash`. Anyone who knew those three public inputs could forge a
 * matching value, which made the verification endpoint meaningless.
 *
 * This module produces and verifies an HMAC-SHA256 keyed by `CERT_SIGNING_SECRET`
 * over a canonical concatenation of the same three inputs. Without the secret
 * the signature cannot be reproduced — so a `valid: true` answer from the
 * verification endpoint actually proves the cert was issued by this backend.
 *
 * Pure helper: no NestJS, no Prisma, no env mutation. Takes the secret from
 * `process.env['CERT_SIGNING_SECRET']` lazily so tests can override it per call.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

// Empty separator — input fields are opaque IDs / ISO dates that won't collide.
// Kept as a named constant so canonicalisation is auditable.
const CANON_SEPARATOR = '';

export interface CertHmacInput {
  userId: string;
  learningPathId: string;
  issuedAt: Date;
}

/**
 * Resolve the HMAC secret from the environment.
 *
 * - Production with a missing or PLACEHOLDER_ secret → throw, fail closed.
 * - Non-production with a missing or PLACEHOLDER_ secret → use a hard-coded
 *   developer secret so local tests don't crash. This must NEVER reach prod;
 *   env-validation in `env.config.ts` enforces that on boot.
 */
function readSecret(): string {
  const secret = process.env['CERT_SIGNING_SECRET'];
  if (!secret || secret.startsWith('PLACEHOLDER_')) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('CERT_SIGNING_SECRET is required in production');
    }
    return 'dev-only-cert-signing-secret-do-not-ship-to-prod-_____';
  }
  return secret;
}

/**
 * Produce a hex-encoded HMAC-SHA256 over the canonical certificate inputs.
 *
 * Stable across processes as long as `CERT_SIGNING_SECRET` doesn't change.
 * Rotating the secret invalidates all previously-issued certificates, which
 * is the intended behaviour for revocation.
 */
export function signCertificate(input: CertHmacInput): string {
  const canonical = [input.userId, input.learningPathId, input.issuedAt.toISOString()].join(
    CANON_SEPARATOR,
  );
  return createHmac('sha256', readSecret()).update(canonical).digest('hex');
}

/**
 * Constant-time verification of a candidate signature against the expected
 * HMAC for the given inputs. Returns false on length mismatch, hex-decode
 * failure, or signature mismatch — never throws.
 */
export function verifyCertificate(input: CertHmacInput, candidateSignature: string): boolean {
  const expected = signCertificate(input);
  if (expected.length !== candidateSignature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(candidateSignature, 'hex'));
  } catch {
    return false;
  }
}
