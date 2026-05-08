import Link from 'next/link';
import { Badge } from '@levelup/ui';
import type { RiskFlag } from '@/lib/api/reports';

interface RiskFlagsTableProps {
  flags: RiskFlag[];
}

const SEVERITY_STYLES: Record<RiskFlag['severity'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function RiskFlagsTable({ flags }: RiskFlagsTableProps) {
  if (flags.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-paper-300 italic">No risk flags — great work!</p>
    );
  }

  const top20 = flags
    .slice()
    .sort((a, b) => {
      const order: Record<RiskFlag['severity'], number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 20);

  return (
    <div className="overflow-hidden rounded-xl border border-ink-600">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink-600 bg-ink-700/50">
              <th className="px-4 py-3 text-left font-semibold">Severity</th>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Department</th>
              <th className="px-4 py-3 text-left font-semibold">Reason</th>
              <th className="px-4 py-3 text-left font-semibold">Flagged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {top20.map((flag) => (
              <tr
                key={`${flag.userId}-${flag.flagType}-${flag.flaggedAt}`}
                className="bg-ink-900 hover:bg-ink-700/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[flag.severity]}`}
                  >
                    {flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/people/${flag.userId}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {flag.userName}
                  </Link>
                  <p className="text-xs text-paper-300">{flag.email}</p>
                </td>
                <td className="px-4 py-3 text-paper-300">{flag.departmentId ?? '—'}</td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="line-clamp-2 text-paper-300" title={flag.detail}>
                    {flag.detail}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {flag.flagType}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-paper-300 whitespace-nowrap">
                  {formatDate(flag.flaggedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {flags.length > 20 && (
        <div className="border-t border-ink-600 bg-ink-700/20 px-4 py-2 text-center text-xs text-paper-300">
          Showing top 20 of {flags.length} flags
        </div>
      )}
    </div>
  );
}
