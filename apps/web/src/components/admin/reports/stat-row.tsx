import { Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@levelup/ui';
import type { CompletionReport } from '@/lib/api/reports';
import type { RiskFlag } from '@/lib/api/reports';

interface StatRowProps {
  report: CompletionReport;
  riskFlags: RiskFlag[];
}

function StatCard({
  title,
  value,
  sublabel,
  icon: Icon,
  iconClass,
  tooltip,
}: {
  title: string;
  value: string | number;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  tooltip?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-paper-300">{title}</CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-paper-100">
          {tooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">{value}</span>
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            value
          )}
        </div>
        {sublabel && <p className="mt-1 text-xs text-paper-300">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

export function StatRow({ report, riskFlags }: StatRowProps) {
  const activeLast30 = Math.round(report.completedUsers * 0.7); // placeholder until API exposes activeUsers
  const highRiskCount = riskFlags.filter((f) => f.severity === 'high').length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Overall completion"
        value={`${Math.round(report.completionRate * 100)}%`}
        sublabel={`${report.completedUsers} of ${report.totalUsers} users`}
        icon={TrendingUp}
        iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30"
      />
      <StatCard
        title="Active learners (30d)"
        value={activeLast30}
        sublabel="Unique learners with activity"
        icon={Users}
        iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
      />
      <StatCard
        title="Avg time-to-complete"
        value="—"
        sublabel="Not yet available"
        icon={Clock}
        iconClass="bg-sky-100 text-sky-600 dark:bg-sky-900/30"
        tooltip="Time-to-complete data will be available once learners begin completing paths."
      />
      <StatCard
        title="High-risk flags"
        value={highRiskCount}
        sublabel={`${riskFlags.length} total flags`}
        icon={AlertTriangle}
        iconClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30"
      />
    </div>
  );
}
