import { Card, CardContent, MonoLabel } from '@levelup/ui';

interface PostureRow {
  control: string;
  status: string;
  detail: string;
  tone: 'success' | 'signal' | 'paper';
}

const ROWS: PostureRow[] = [
  {
    control: 'SOC 2 Type II',
    status: 'IN PROGRESS',
    detail: 'Audit window started 2026-Q1; report targeted for 2026-Q3.',
    tone: 'signal',
  },
  {
    control: 'GDPR + Data Processing Agreement',
    status: 'AVAILABLE',
    detail: 'Standard DPA executable on request.',
    tone: 'success',
  },
  {
    control: 'EU data residency',
    status: 'ROADMAP',
    detail: 'EU-region tenancy planned for 2026-Q4.',
    tone: 'paper',
  },
  {
    control: 'Encryption at rest',
    status: 'ACTIVE',
    detail: 'Supabase-managed AES-256 across Postgres + storage.',
    tone: 'success',
  },
  {
    control: 'Encryption in transit',
    status: 'ACTIVE',
    detail: 'TLS 1.3 enforced on every API edge.',
    tone: 'success',
  },
  {
    control: 'Session encryption',
    status: 'ACTIVE',
    detail: 'JWE (dir + A256GCM); session payloads opaque to the browser.',
    tone: 'success',
  },
  {
    control: 'Immutable audit log',
    status: 'ACTIVE',
    detail: 'Every mutation written to AuditLog with actor, target, metadata.',
    tone: 'success',
  },
  {
    control: 'Role-based access',
    status: 'ACTIVE',
    detail: 'ADMIN > MANAGER > EMPLOYEE; default-deny on every route.',
    tone: 'success',
  },
];

const TONE_CLASS: Record<PostureRow['tone'], string> = {
  success: 'text-success',
  signal: 'text-signal',
  paper: 'text-paper-300',
};

export function GovernanceSecurity() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-ink-600">
                <th
                  scope="col"
                  className="px-5 py-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500"
                >
                  Control
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500"
                >
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.control} className="border-b border-ink-700 last:border-b-0">
                  <td className="px-5 py-3 text-body-sm text-paper-100">{row.control}</td>
                  <td className="px-3 py-3">
                    <MonoLabel className={TONE_CLASS[row.tone]}>{row.status}</MonoLabel>
                  </td>
                  <td className="px-5 py-3 text-body-sm text-paper-300">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
