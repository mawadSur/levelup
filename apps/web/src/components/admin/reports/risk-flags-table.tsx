import Link from 'next/link';
import { Badge, MonoLabel } from '@levelup/ui';
import type { RiskFlag } from '@/lib/api/reports';

interface RiskFlagsTableProps {
  flags: RiskFlag[];
}

const SEVERITY_VARIANT: Record<RiskFlag['severity'], 'danger' | 'signal' | 'default'> = {
  high: 'danger',
  medium: 'signal',
  low: 'default',
};

function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();
}

export function RiskFlagsTable({ flags }: RiskFlagsTableProps) {
  if (flags.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        NO RISK FLAGS — ALL CLEAR
      </p>
    );
  }

  const top20 = flags
    .slice()
    .sort((a, b) => {
      const order: Record<RiskFlag['severity'], number> = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 20);

  return (
    <div className="overflow-hidden rounded-md border border-ink-600">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-body-sm">
          <thead>
            <tr className="border-b border-ink-600 bg-ink-800">
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Severity
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Operator
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Dept
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Reason
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Flagged
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600">
            {top20.map((flag) => (
              <tr
                key={`${flag.userId}-${flag.flagType}-${flag.flaggedAt}`}
                className="bg-ink-900 transition-colors hover:bg-ink-800"
              >
                <td className="px-4 py-3">
                  <Badge variant={SEVERITY_VARIANT[flag.severity]}>
                    {flag.severity.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/people/${flag.userId}`}
                    className="font-medium text-paper-100 hover:text-signal hover:underline"
                  >
                    {flag.userName}
                  </Link>
                  <p className="font-mono text-mono-sm text-paper-500">{flag.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                  {flag.departmentId ?? '—'}
                </td>
                <td className="max-w-xs px-4 py-3">
                  <p className="line-clamp-2 text-body-sm text-paper-300" title={flag.detail}>
                    {flag.detail}
                  </p>
                  <Badge variant="default" className="mt-1.5">
                    {flag.flagType}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  {formatDate(flag.flaggedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {flags.length > 20 && (
        <div className="border-t border-ink-600 bg-ink-800 px-4 py-2 text-center">
          <MonoLabel>SHOWING TOP 20 OF {flags.length} FLAGS</MonoLabel>
        </div>
      )}
    </div>
  );
}
