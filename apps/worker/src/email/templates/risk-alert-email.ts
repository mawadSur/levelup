/**
 * "risk-alert-email" template.
 *
 * Sent to a manager when their direct report crosses the HIGH risk threshold
 * (3+ sensitive-data flags in a rolling 30-day window).
 *
 * Expected data fields:
 *   managerName     - Manager's display name
 *   learnerName     - Learner's display name
 *   learnerEmail    - Learner's email address
 *   departmentName  - Department name (or 'N/A')
 *   sensitiveCount  - Number of sensitive-data events in the period
 *   periodDays      - Rolling window size in days (typically 30)
 */

export interface RiskAlertEmailData {
  managerName: string;
  learnerName: string;
  learnerEmail: string;
  departmentName: string;
  sensitiveCount: number;
  periodDays: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderRiskAlertEmail(data: RiskAlertEmailData): RenderedEmail {
  const subject = `Coaching opportunity: ${data.learnerName} flagged sensitive data`;

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
        <td style="background-color:#7c1c1c;padding:32px 40px;">
          <p style="margin:0 0 4px;color:#fca5a5;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Risk Alert</p>
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">LevelUp AI Academy</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 40px 24px;">
          <p style="margin:0 0 20px;font-size:15px;color:#374151;">
            Hi ${escapeHtml(data.managerName)},
          </p>

          <p style="margin:0 0 16px;font-size:15px;color:#374151;">
            Your direct report <strong>${escapeHtml(data.learnerName)}</strong>
            (<a href="mailto:${escapeHtml(data.learnerEmail)}" style="color:#7c1c1c;">${escapeHtml(data.learnerEmail)}</a>)
            had <strong>${data.sensitiveCount} sensitive-data warning${data.sensitiveCount !== 1 ? 's' : ''}</strong>
            from the AI coach in the last <strong>${data.periodDays} days</strong>.
          </p>

          <p style="margin:0 0 16px;font-size:15px;color:#374151;">
            The coach already nudged them in the moment &mdash; but a brief 1-on-1 about safe inputs goes a long way.
          </p>

          <!-- Info box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="background-color:#fdf8f0;border-left:4px solid #d4a574;border-radius:4px;padding:16px 20px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#7c1c1c;">Department: ${escapeHtml(data.departmentName)}</p>
                <p style="margin:0;font-size:13px;color:#78350f;">
                  ${data.sensitiveCount} flag${data.sensitiveCount !== 1 ? 's' : ''} in the last ${data.periodDays} days
                </p>
              </td>
            </tr>
          </table>

          <!-- Suggested questions -->
          <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#111827;">Suggested questions for your 1-on-1:</p>
          <ul style="margin:0 0 24px;padding-left:24px;font-size:14px;color:#374151;line-height:1.7;">
            <li>Which tools are they using outside our approved list?</li>
            <li>Is there a workflow we should adapt to make safe usage the easy path?</li>
          </ul>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            &copy; ${new Date().getFullYear()} LevelUp AI Academy. You receive this because you are a manager in your organisation.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `RISK ALERT — LevelUp AI Academy`,
    ``,
    `Hi ${data.managerName},`,
    ``,
    `Your direct report ${data.learnerName} (${data.learnerEmail}) had ${data.sensitiveCount} sensitive-data warning${data.sensitiveCount !== 1 ? 's' : ''} from the AI coach in the last ${data.periodDays} days. The coach already nudged them in the moment — but a brief 1-on-1 about safe inputs goes a long way.`,
    ``,
    `Department: ${data.departmentName}`,
    ``,
    `Suggested questions:`,
    `  - Which tools are they using outside our approved list?`,
    `  - Is there a workflow we should adapt to make safe usage the easy path?`,
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
