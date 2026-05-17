import type { CompletionReport } from '@/lib/api/reports';
import { AnimatedProgressBar } from '@/components/admin/animated-progress-bar';

interface DeptCompletionBarsProps {
  byDepartment: CompletionReport['byDepartment'];
}

/**
 * Renders the per-department completion bars on /admin/reports.
 *
 * Field names match the API's `DepartmentCompletionRow`:
 *   - `departmentName` (not `name`)
 *   - `assigned` (the headcount we display as "N members", not `memberCount`)
 *   - `completionRate` is already 0..100, NOT a 0..1 ratio.
 *
 * `AnimatedProgressBar` expects a 0..1 input, so we divide here.
 */
export function DeptCompletionBars({ byDepartment }: DeptCompletionBarsProps) {
  if (byDepartment.length === 0) {
    return <p className="text-sm text-paper-300 italic">No department data available.</p>;
  }

  const sorted = [...byDepartment].sort((a, b) => b.completionRate - a.completionRate);

  return (
    <ul className="space-y-3">
      {sorted.map((dept) => {
        const pct = dept.completionRate; // 0..100 from the API
        return (
          <li key={dept.departmentId || dept.departmentName} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-paper-100 truncate max-w-[60%]">
                {dept.departmentName}
              </span>
              <span className="text-paper-300 tabular-nums">
                {pct}%<span className="ml-1.5 text-xs">({dept.assigned} members)</span>
              </span>
            </div>
            <AnimatedProgressBar
              value={pct / 100}
              label={`${dept.departmentName} completion: ${pct}%`}
            />
          </li>
        );
      })}
    </ul>
  );
}
