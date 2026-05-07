/**
 * Stub email outbox — writes .eml files when RESEND_API_KEY is a placeholder.
 *
 * Files are written to apps/api/.outbox/ as:
 *   <ISO-timestamp>-<to>-<templateKey>.eml
 *
 * The .eml format is RFC 5322 compatible — it can be opened in any email
 * client for visual inspection during local development and CI.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { emailOutboxDir } from '../config.js';

export interface StubEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  templateKey: string;
}

/**
 * Write a stub .eml file and return a synthetic message ID.
 */
export async function writeStubEmail(payload: StubEmailPayload): Promise<string> {
  await fs.mkdir(emailOutboxDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  // Sanitise `to` for use in filenames (strip special chars)
  const safeRecipient = payload.to.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}-${safeRecipient}-${payload.templateKey}.eml`;
  const filePath = path.join(emailOutboxDir, filename);

  const date = new Date().toUTCString();
  const messageId = `stub-${Date.now()}-${Math.random().toString(36).slice(2)}@levelupai.local`;

  const eml = [
    `Message-ID: <${messageId}>`,
    `Date: ${date}`,
    `From: ${payload.from}`,
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="====LEVELUP===="`,
    `X-LevelUp-Template: ${payload.templateKey}`,
    `X-LevelUp-Stub: true`,
    ``,
    `--====LEVELUP====`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    payload.text,
    ``,
    `--====LEVELUP====`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    payload.html,
    ``,
    `--====LEVELUP====--`,
  ].join('\r\n');

  await fs.writeFile(filePath, eml, 'utf-8');

  return messageId;
}
