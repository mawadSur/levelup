/**
 * "invitation" email template.
 *
 * Subject: You're invited to {orgName}'s LevelUp AI Academy
 *
 * Expected data fields:
 *   orgName    - Organisation name
 *   inviterName - Name of the person who sent the invite
 *   token      - Raw invitation token (used to build acceptUrl)
 *   expiresAt  - ISO date string for expiry notice
 *   role       - Role being granted (EMPLOYEE | MANAGER | ADMIN)
 *   appUrl     - Base app URL (injected from config)
 */

export interface InvitationData {
  orgName: string;
  inviterName: string;
  token: string;
  expiresAt: string;
  role: string;
  appUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderInvitation(data: InvitationData): RenderedEmail {
  const acceptUrl = `${data.appUrl}/accept-invitation?token=${encodeURIComponent(data.token)}`;

  const expiryDate = new Date(data.expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `You're invited to ${data.orgName}'s LevelUp AI Academy`;

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
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">LevelUp AI Academy</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 16px;font-size:24px;color:#111827;">You're invited!</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
            <strong>${escapeHtml(data.inviterName)}</strong> has invited you to join
            <strong>${escapeHtml(data.orgName)}</strong> on LevelUp AI Academy as a
            <strong>${escapeHtml(data.role.toLowerCase())}</strong>.
          </p>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#374151;">
            LevelUp AI Academy helps your team build practical AI skills through structured
            learning paths, assessments, and certifications — tailored to your organisation.
          </p>

          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr>
              <td style="background-color:#1E40AF;border-radius:6px;text-align:center;">
                <a href="${acceptUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                  Accept Invitation
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#6B7280;">
            Or copy this link into your browser:
          </p>
          <p style="margin:0 0 24px;font-size:13px;color:#1E40AF;word-break:break-all;">
            <a href="${acceptUrl}" style="color:#1E40AF;">${acceptUrl}</a>
          </p>

          <p style="margin:0;font-size:13px;color:#6B7280;">
            This invitation expires on <strong>${expiryDate}</strong>. If you did not expect
            this email you can safely ignore it.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            &copy; ${new Date().getFullYear()} LevelUp AI Academy. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `You're invited to ${data.orgName}'s LevelUp AI Academy`,
    ``,
    `${data.inviterName} has invited you to join ${data.orgName} on LevelUp AI Academy`,
    `as a ${data.role.toLowerCase()}.`,
    ``,
    `Accept your invitation here:`,
    acceptUrl,
    ``,
    `This invitation expires on ${expiryDate}.`,
    ``,
    `If you did not expect this email you can safely ignore it.`,
    ``,
    `-- LevelUp AI Academy`,
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
