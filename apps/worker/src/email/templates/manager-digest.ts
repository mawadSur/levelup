/**
 * "manager-digest" email template.
 *
 * Subject: Your team's AI training — weekly
 *
 * Expected data fields:
 *   managerName         - Manager's display name
 *   orgName             - Organisation name
 *   completionPct       - Overall completion % (0–100, integer)
 *   totalLearners       - Total active learners in scope
 *   completedLearners   - Learners who completed at least one path this week
 *   riskFlags           - Array of up to 3 risk flag objects { label, count }
 *   appUrl              - Base app URL
 *   periodLabel         - Human-readable period, e.g. "Apr 28 – May 4, 2026"
 */

import { academyName } from '../../config.js';

export interface RiskFlag {
  label: string;
  count: number;
}

export interface ManagerDigestData {
  managerName: string;
  orgName: string;
  completionPct: number;
  totalLearners: number;
  completedLearners: number;
  riskFlags: RiskFlag[];
  appUrl: string;
  periodLabel: string;
  /**
   * Optional pre-composed narrative (4-paragraph prose + appendix). When set,
   * replaces the stat-box body. The legacy stat-box layout is rendered only
   * when this is absent so the template stays usable for older callers.
   */
  narrative?: {
    subject?: string;
    /** HTML for body — already-escaped paragraphs + detailed numbers appendix. */
    html: string;
    /** Plain-text body — paragraphs + detailed numbers appendix. */
    text: string;
  };
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderManagerDigest(data: ManagerDigestData): RenderedEmail {
  const reportsUrl = `${data.appUrl}/admin/reports`;

  const subject =
    data.narrative?.subject && data.narrative.subject.length > 0
      ? data.narrative.subject
      : `Your team's AI training — weekly`;

  // Clamp to top 3 risk flags
  const topRisks = data.riskFlags.slice(0, 3);

  const riskRowsHtml = topRisks.length
    ? topRisks
        .map(
          (rf) =>
            `<tr>
              <td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #F3F4F6;">
                ${escapeHtml(rf.label)}
              </td>
              <td style="padding:8px 0;font-size:14px;color:#B91C1C;font-weight:bold;text-align:right;border-bottom:1px solid #F3F4F6;">
                ${rf.count} learner${rf.count !== 1 ? 's' : ''}
              </td>
            </tr>`,
        )
        .join('\n')
    : `<tr><td colspan="2" style="padding:8px 0;font-size:14px;color:#6B7280;">No risk flags this week &#127881;</td></tr>`;

  const riskRowsText = topRisks.length
    ? topRisks
        .map((rf) => `  • ${rf.label}: ${rf.count} learner${rf.count !== 1 ? 's' : ''}`)
        .join('\n')
    : '  No risk flags this week.';

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
        <td style="background-color:#1E40AF;padding:32px 40px;">
          <p style="margin:0 0 4px;color:#93C5FD;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Weekly Digest</p>
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">${academyName}</p>
        </td>
      </tr>

      <!-- Period banner -->
      <tr>
        <td style="background-color:#EFF6FF;padding:12px 40px;border-bottom:1px solid #DBEAFE;">
          <p style="margin:0;font-size:13px;color:#1D4ED8;">
            <strong>${escapeHtml(data.orgName)}</strong> &mdash; ${escapeHtml(data.periodLabel)}
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 40px 24px;">
          <p style="margin:0 0 24px;font-size:15px;color:#374151;">Hi ${escapeHtml(data.managerName)},</p>

          ${
            data.narrative
              ? `<!-- Narrative body (replaces legacy stat boxes; numbers appendix is embedded inside narrative.html) -->
          <div style="margin-bottom:28px;">${data.narrative.html}</div>`
              : `<!-- Stat boxes (legacy fallback) -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td width="33%" style="padding:16px;background-color:#F0FDF4;border-radius:6px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:bold;color:#15803D;">${data.completionPct}%</p>
                <p style="margin:4px 0 0;font-size:12px;color:#166534;">Completion rate</p>
              </td>
              <td width="4%"></td>
              <td width="30%" style="padding:16px;background-color:#EFF6FF;border-radius:6px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:bold;color:#1D4ED8;">${data.completedLearners}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#1E40AF;">Completions</p>
              </td>
              <td width="4%"></td>
              <td width="29%" style="padding:16px;background-color:#F9FAFB;border-radius:6px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:bold;color:#374151;">${data.totalLearners}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">Total learners</p>
              </td>
            </tr>
          </table>

          <!-- Risk flags -->
          <h2 style="margin:0 0 12px;font-size:16px;color:#111827;">Risk flags</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            ${riskRowsHtml}
          </table>`
          }

          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:#1E40AF;border-radius:6px;text-align:center;">
                <a href="${reportsUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                  View Full Report
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            &copy; ${new Date().getFullYear()} ${academyName}. You receive this because you're a manager in ${escapeHtml(data.orgName)}.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const textLines: string[] = [
    `Weekly Digest — ${data.orgName} — ${data.periodLabel}`,
    ``,
    `Hi ${data.managerName},`,
    ``,
  ];

  if (data.narrative) {
    // Narrative already contains paragraphs + appendix.
    textLines.push(data.narrative.text);
  } else {
    textLines.push(
      `COMPLETION SUMMARY`,
      `  Completion rate:  ${data.completionPct}%`,
      `  Completions:      ${data.completedLearners}`,
      `  Total learners:   ${data.totalLearners}`,
      ``,
      `RISK FLAGS`,
      riskRowsText,
    );
  }

  textLines.push(``, `View the full report:`, reportsUrl, ``, `-- ${academyName}`);

  const text = textLines.join('\n');

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
