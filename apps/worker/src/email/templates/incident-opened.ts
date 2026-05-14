/**
 * "incident-opened" template.
 *
 * Sent to CISO / admins when a HIGH or CRITICAL incident is opened by the
 * incident workflow loop (typically auto-generated from the coach's
 * sensitive-data classifier crossing the severity threshold for credentials,
 * SSN, PHI, or credit-card patterns).
 *
 * Expected data fields:
 *   adminName        - Recipient admin/CISO display name
 *   learnerName      - Actor user display name
 *   learnerEmail     - Actor user email
 *   severity         - 'HIGH' | 'CRITICAL' (the only severities that email)
 *   kind             - IncidentKind string
 *   triggeredBy      - 'coach' | 'lab' | 'slack' | 'manual'
 *   reason           - Short human-readable reason (sensitive-data classifier reason text)
 *   incidentUrl      - Deep link to /admin/incidents/:id
 *   organizationId   - Org id (audit log only)
 */

import { academyName } from '../../config.js';

export interface IncidentOpenedData {
  adminName: string;
  learnerName: string;
  learnerEmail: string;
  severity: 'HIGH' | 'CRITICAL';
  kind: string;
  triggeredBy: string;
  reason: string;
  incidentUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderIncidentOpened(data: IncidentOpenedData): RenderedEmail {
  const subject = `[${data.severity}] Incident opened: ${data.learnerName} — ${prettyKind(data.kind)}`;

  const accent = data.severity === 'CRITICAL' ? '#7c1c1c' : '#9a3412';
  const accentLight = data.severity === 'CRITICAL' ? '#fca5a5' : '#fed7aa';

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

      <tr>
        <td style="background-color:${accent};padding:32px 40px;">
          <p style="margin:0 0 4px;color:${accentLight};font-size:12px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(data.severity)} Incident</p>
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">${academyName}</p>
        </td>
      </tr>

      <tr>
        <td style="padding:32px 40px 24px;">
          <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${escapeHtml(data.adminName)},</p>

          <p style="margin:0 0 16px;font-size:15px;color:#374151;">
            A <strong>${escapeHtml(data.severity)}</strong> incident has been opened for
            <strong>${escapeHtml(data.learnerName)}</strong>
            (<a href="mailto:${escapeHtml(data.learnerEmail)}" style="color:${accent};">${escapeHtml(data.learnerEmail)}</a>).
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="background-color:#fef2f2;border-left:4px solid ${accent};border-radius:4px;padding:16px 20px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:${accent};">${escapeHtml(prettyKind(data.kind))}</p>
                <p style="margin:0 0 4px;font-size:13px;color:#7c2d12;">Triggered by: ${escapeHtml(data.triggeredBy)}</p>
                <p style="margin:0;font-size:13px;color:#7c2d12;">${escapeHtml(data.reason)}</p>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 24px;text-align:center;">
            <a href="${escapeHtml(data.incidentUrl)}" style="display:inline-block;background-color:${accent};color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
              View Incident
            </a>
          </p>

          <p style="margin:0;font-size:13px;color:#6b7280;">
            Acknowledge or dismiss in the admin console. Assigned remediation labs auto-resolve the
            incident on first pass.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            &copy; ${new Date().getFullYear()} ${academyName}. You receive this because you are an admin in your organisation.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `${data.severity} INCIDENT — ${academyName}`,
    ``,
    `Hi ${data.adminName},`,
    ``,
    `A ${data.severity} incident has been opened for ${data.learnerName} (${data.learnerEmail}).`,
    ``,
    `Kind: ${prettyKind(data.kind)}`,
    `Triggered by: ${data.triggeredBy}`,
    `Reason: ${data.reason}`,
    ``,
    `View incident: ${data.incidentUrl}`,
    ``,
    `-- ${academyName}`,
  ].join('\n');

  return { subject, html, text };
}

function prettyKind(kind: string): string {
  return kind
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
