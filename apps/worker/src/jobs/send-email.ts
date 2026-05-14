/**
 * send-email job handler.
 *
 * Routes to the correct template, renders HTML + text, then either:
 *   - Real mode: sends via Resend SDK.
 *   - Stub mode: writes a .eml file to apps/api/.outbox/.
 *
 * Writes an audit log entry after every successful send with the template key
 * and a SHA-256 hash of the recipient address (PII protection).
 *
 * Returns: { messageId }
 */

import crypto from 'node:crypto';
import type { Job } from 'bullmq';
import type { SendEmailInput, SendEmailOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import { logger } from '../logger.js';
import { isEmailStubMode, emailFrom, appUrl } from '../config.js';
import { writeStubEmail } from '../email/stub-outbox.js';
import { getResend } from '../email/resend-client.js';

// Templates
import { renderInvitation, type InvitationData } from '../email/templates/invitation.js';
import { renderCertificate, type CertificateEmailData } from '../email/templates/certificate.js';
import { renderWelcome, type WelcomeEmailData } from '../email/templates/welcome.js';
import { renderManagerDigest, type ManagerDigestData } from '../email/templates/manager-digest.js';
import {
  renderRiskAlertEmail,
  type RiskAlertEmailData,
} from '../email/templates/risk-alert-email.js';
import {
  renderIncidentOpened,
  type IncidentOpenedData,
} from '../email/templates/incident-opened.js';

// ---------------------------------------------------------------------------
// Template dispatch
// ---------------------------------------------------------------------------

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function renderTemplate(
  templateKey: SendEmailInput['templateKey'],
  data: Record<string, unknown>,
): RenderedEmail {
  switch (templateKey) {
    case 'invitation':
      return renderInvitation({ ...(data as unknown as InvitationData), appUrl });

    case 'certificate':
      return renderCertificate({ ...(data as unknown as CertificateEmailData), appUrl });

    case 'welcome':
      return renderWelcome({ ...(data as unknown as WelcomeEmailData), appUrl });

    case 'manager-digest':
      return renderManagerDigest({ ...(data as unknown as ManagerDigestData), appUrl });

    case 'account-deletion-confirmation':
      return {
        subject: 'Confirm your account deletion — LevelUp AI Academy',
        html: `<p>You requested account deletion. <a href="${String(data['confirmUrl'] ?? '#')}">Click here to confirm</a>. Your account will be permanently deleted 30 days after confirmation.</p>`,
        text: `You requested account deletion. Visit this URL to confirm: ${String(data['confirmUrl'] ?? '')}. Your account will be permanently deleted 30 days after confirmation.`,
      };

    case 'risk-alert-email':
      return renderRiskAlertEmail({ ...(data as unknown as RiskAlertEmailData) });

    case 'incident-opened':
      return renderIncidentOpened({ ...(data as unknown as IncidentOpenedData) });
  }
}

// ---------------------------------------------------------------------------
// PII helper
// ---------------------------------------------------------------------------

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleSendEmail(job: Job<SendEmailInput>): Promise<SendEmailOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const { to, templateKey, data } = job.data;

  log.info('send-email: starting', { templateKey, toHash: hashEmail(to) });
  const start = Date.now();

  // Render template
  const { subject, html, text } = renderTemplate(templateKey, data);

  let messageId: string;

  if (isEmailStubMode) {
    // Stub path — write .eml file
    messageId = await writeStubEmail({ from: emailFrom, to, subject, html, text, templateKey });
    log.info('send-email: stub mode — wrote .eml', {
      templateKey,
      toHash: hashEmail(to),
      messageId,
    });
  } else {
    // Real path — send via Resend
    const resend = getResend();
    const result = await resend.emails.send({
      from: emailFrom,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      throw new Error(
        `Resend API error for template=${templateKey}: ${result.error.message ?? JSON.stringify(result.error)}`,
      );
    }

    messageId = result.data?.id ?? `resend-unknown-${Date.now()}`;
    log.info('send-email: sent via Resend', { templateKey, toHash: hashEmail(to), messageId });
  }

  // -------------------------------------------------------------------------
  // Audit log
  // We need an organizationId — try to resolve it from `data.organizationId`;
  // if not present, use a system-level org lookup or skip gracefully.
  // -------------------------------------------------------------------------
  const organizationId = typeof data['organizationId'] === 'string' ? data['organizationId'] : null;

  if (organizationId) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId: null,
        action: 'email.sent',
        targetType: 'Email',
        targetId: null,
        metadata: {
          templateKey,
          toHash: hashEmail(to),
          messageId,
          stubMode: isEmailStubMode,
        },
      },
    });
  } else {
    log.warn('send-email: no organizationId in data — skipping audit log', {
      templateKey,
    });
  }

  const durationMs = Date.now() - start;
  log.info('send-email: completed', { templateKey, messageId, durationMs });

  return { messageId };
}
