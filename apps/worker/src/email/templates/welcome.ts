/**
 * "welcome" email template.
 *
 * Subject: Welcome to ${academyName}
 *
 * Expected data fields:
 *   userName   - Recipient display name
 *   appUrl     - Base app URL
 */

import { academyName } from '../../config.js';

export interface WelcomeEmailData {
  userName: string;
  appUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderWelcome(data: WelcomeEmailData): RenderedEmail {
  const assessmentUrl = `${data.appUrl}/assessments/baseline`;
  const learnUrl = `${data.appUrl}/learn`;

  const subject = `Welcome to ${academyName}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
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

      <!-- Body -->
      <tr>
        <td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 16px;font-size:24px;color:#111827;">
            Welcome, ${escapeHtml(data.userName)}! &#128640;
          </h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
            You're all set on ${academyName}. We'll help you and your team build
            practical AI skills at the right level for your role.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
            The first step is a short <strong>baseline assessment</strong> — it takes
            about 5 minutes and helps us personalise your learning path.
          </p>

          <!-- Assessment CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
            <tr>
              <td style="background-color:#1E40AF;border-radius:6px;text-align:center;">
                <a href="${assessmentUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                  Take Baseline Assessment
                </a>
              </td>
            </tr>
          </table>

          <!-- Browse link -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr>
              <td style="text-align:center;">
                <a href="${learnUrl}" style="display:inline-block;padding:12px 28px;color:#1E40AF;font-size:14px;text-decoration:underline;">
                  Browse learning paths first
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#6B7280;">
            You can revisit this assessment any time from your dashboard.
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
    `Welcome, ${data.userName}!`,
    ``,
    `You're all set on ${academyName}.`,
    ``,
    `Start with a short baseline assessment (about 5 minutes) so we can`,
    `personalise your learning path:`,
    assessmentUrl,
    ``,
    `Or browse learning paths directly:`,
    learnUrl,
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
