/**
 * "certificate" email template.
 *
 * Subject: Your {pathTitle} certificate is ready
 *
 * Expected data fields:
 *   userName       - Recipient display name
 *   pathTitle      - Learning path title
 *   certificateId  - Certificate ID (used to build download URL)
 *   verifyCode     - Short verification code printed on the cert
 *   appUrl         - Base app URL
 */

import { academyName } from '../../config.js';

export interface CertificateEmailData {
  userName: string;
  pathTitle: string;
  certificateId: string;
  verifyCode: string;
  appUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderCertificate(data: CertificateEmailData): RenderedEmail {
  const downloadUrl = `${data.appUrl}/api/certificates/${encodeURIComponent(data.certificateId)}/file`;
  const verifyUrl = `${data.appUrl}/verify-certificate?code=${encodeURIComponent(data.verifyCode)}`;

  const subject = `Your ${data.pathTitle} certificate is ready`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

      <!-- Header -->
      <tr>
        <td style="background-color:#1E40AF;padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">${academyName}</p>
        </td>
      </tr>

      <!-- Gold accent bar -->
      <tr>
        <td style="height:4px;background-color:#D97706;"></td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:40px 40px 32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#374151;">Hi ${escapeHtml(data.userName)},</p>
          <h1 style="margin:0 0 20px;font-size:24px;color:#111827;">
            &#127941; Your certificate is ready!
          </h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
            Congratulations on completing <strong>${escapeHtml(data.pathTitle)}</strong>.
            Your certificate is ready to download and share.
          </p>

          <!-- Download Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr>
              <td style="background-color:#1E40AF;border-radius:6px;text-align:center;">
                <a href="${downloadUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                  Download Certificate
                </a>
              </td>
            </tr>
          </table>

          <!-- Verify Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr>
              <td style="background-color:#ffffff;border:2px solid #1E40AF;border-radius:6px;text-align:center;">
                <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;color:#1E40AF;font-size:15px;font-weight:bold;text-decoration:none;">
                  Verify Certificate
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#6B7280;">
            Verification code: <code style="background:#F3F4F6;padding:2px 6px;border-radius:3px;font-size:12px;">${escapeHtml(data.verifyCode)}</code>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            &copy; ${new Date().getFullYear()} ${academyName}. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `Hi ${data.userName},`,
    ``,
    `Congratulations on completing ${data.pathTitle}!`,
    ``,
    `Your certificate is ready. Download it here:`,
    downloadUrl,
    ``,
    `Verify its authenticity at:`,
    verifyUrl,
    ``,
    `Verification code: ${data.verifyCode}`,
    ``,
    `-- ${academyName}`,
  ].join('\n');

  return { subject, html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
