import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import type { DeptRiskRow } from '@/lib/api/governance';
import { cn } from '@/lib/utils';

interface RiskByDeptTableProps {
  rows: DeptRiskRow[];
  windowDays: number;
}

function riskTone(score: number) {
  if (score >= 60) return 'text-danger';
  if (score >= 30) return 'text-warning';
  if (score >= 10) return 'text-signal';
  return 'text-paper-300';
}

function trendIcon(trend: DeptRiskRow['trend']) {
  if (trend === 'up') return <ArrowUp className="h-3 w-3 text-danger" aria-label="up" />;
  if (trend === 'down') return <ArrowDown className="h-3 w-3 text-success" aria-label="down" />;
  return <Minus className="h-3 w-3 text-paper-500" aria-label="flat" />;
}

export function RiskByDeptTable({ rows, windowDays }: RiskByDeptTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <MonoLabel className="text-paper-500">
            NO DEPARTMENTS WITH ACTIVE HEADCOUNT
          </MonoLabel>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-ink-600">
                <th scope="col" className="px-5 py-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  Department
                </th>
                <th scope="col" className="px-3 py-3 text-right font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  Headcount
                </th>
                <th scope="col" className="px-3 py-3 text-right font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  DAU {windowDays}d
                </th>
                <th scope="col" className="px-3 py-3 text-right font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  Triggers {windowDays}d
                </th>
                <th scope="col" className="px-3 py-3 text-right font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  Policy %
                </th>
                <th scope="col" className="px-3 py-3 text-right font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  Risk
                </th>
                <th scope="col" className="px-5 py-3 text-right font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.departmentId ?? '__unassigned'}
                  className="border-b border-ink-700 last:border-b-0"
                >
                  <td className="px-5 py-3 text-body-sm text-paper-100">
                    {row.departmentName}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-mono-sm tabular-nums text-paper-300">
                    {row.headcount}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-mono-sm tabular-nums text-paper-300">
                    {row.coachDau30}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-3 text-right font-mono text-mono-sm tabular-nums',
                      row.sensitiveTriggers > 0 ? 'text-signal' : 'text-paper-500',
                    )}
                  >
                    {row.sensitiveTriggers}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-mono-sm tabular-nums text-paper-300">
                    {row.policyCompletionPct}%
                  </td>
                  <td
                    className={cn(
                      'px-3 py-3 text-right font-mono text-mono-sm tabular-nums',
                      riskTone(row.riskScore),
                    )}
                  >
                    {row.riskScore}
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center justify-end">
                      {trendIcon(row.trend)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
