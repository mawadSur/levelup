/**
 * Lazy singleton Resend client.
 *
 * IMPORTANT: only call `getResend()` after confirming that `isEmailStubMode`
 * is false. The send-email job handler branches on stub mode BEFORE invoking
 * this module. Calling it in stub mode throws immediately by design so the
 * stub path is never accidentally skipped.
 */

import { Resend } from 'resend';
import { isEmailStubMode, resendApiKey } from '../config.js';

let _client: Resend | undefined;

/**
 * Return the shared Resend client instance.
 * Throws if the worker is running in email stub mode.
 */
export function getResend(): Resend {
  if (isEmailStubMode) {
    throw new Error(
      '[resend-client] Cannot use Resend SDK in stub mode. ' +
        'Set RESEND_API_KEY to a non-placeholder value.',
    );
  }

  if (!_client) {
    _client = new Resend(resendApiKey);
  }

  return _client;
}
