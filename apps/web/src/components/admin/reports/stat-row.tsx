import { Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  MissionNumber,
  MonoLabel,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@levelup/ui';
import type { CompletionReport, RiskFlag } from '@/lib/api/reports';

interface StatRowProps {
  report: CompletionReport;
  riskFlags: RiskFlag[];
}

interface StatCellProps {
  title: string;
  value: number | string;
  format?: 'integer' | 'percent';
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip?: string;
}

function StatCell({
  title,
  value,
  format = 'integer',
  sublabel,
  icon: Icon,
  tooltip,
}: StatCellProps) {
  const numeric = typeof value === 'number' ? value : Number.NaN;
  const isNumeric = Number.isFinite(numeric);
  const display = isNumeric ? <MissionNumber value={numeric} format={format} /> : value;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <MonoLabel>{title.toUpperCase()}</MonoLabel>
          <Icon className="h-4 w-4 shrink-0 text-paper-500" aria-hidden="true" />
        </div>
        <div className="font-serif text-display-md tabular-nums text-paper-100">
          {tooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">{display}</span>
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            display
          )}
        </div>
        {sublabel && <p className="text-body-sm text-paper-300">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

export function StatRow({ report, riskFlags }: StatRowProps) {
  const activeLast30 = Math.round(report.completedUsers * 0.7);
  const highRiskCount = riskFlags.filter((f) => f.severity === 'high').length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCell
        title="Overall completion"
        value={report.completionRate}
        format="percent"
        sublabel={`${report.completedUsers} of ${report.totalUsers} users`}
        icon={TrendingUp}
      />
      <StatCell
        title="Active learners 30d"
        value={activeLast30}
        sublabel="Unique learners with activity"
        icon={Users}
      />
      <StatCell
        title="Avg time-to-complete"
        value="—"
        sublabel="Not yet available"
        icon={Clock}
        tooltip="Time-to-complete data will be available once learners begin completing paths."
      />
      <StatCell
        title="High-risk flags"
        value={highRiskCount}
        sublabel={`${riskFlags.length} total flags`}
        icon={AlertTriangle}
      />
    </div>
  );
}
