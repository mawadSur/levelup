import type { CompletionReport } from '@/lib/api/reports';
import { AnimatedProgressBar } from '@/components/admin/animated-progress-bar';

interface DeptCompletionBarsProps {
  byDepartment: CompletionReport['byDepartment'];
}

export function DeptCompletionBars({ byDepartment }: DeptCompletionBarsProps) {
  if (byDepartment.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No department data available.</p>;
  }

  const sorted = [...byDepartment].sort((a, b) => b.completionRate - a.completionRate);

  return (
    <ul className="space-y-3">
      {sorted.map((dept) => {
        const pct = Math.round(dept.completionRate * 100);
        return (
          <li key={dept.departmentId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground truncate max-w-[60%]">{dept.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {pct}%<span className="ml-1.5 text-xs">({dept.memberCount} members)</span>
              </span>
            </div>
            <AnimatedProgressBar
              value={dept.completionRate}
              label={`${dept.name} completion: ${pct}%`}
            />
          </li>
        );
      })}
    </ul>
  );
}
