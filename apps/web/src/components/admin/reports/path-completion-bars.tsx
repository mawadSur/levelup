import type { CompletionReport } from '@/lib/api/reports';
import { AnimatedProgressBar } from '@/components/admin/animated-progress-bar';

interface PathCompletionBarsProps {
  byPath: CompletionReport['byPath'];
}

export function PathCompletionBars({ byPath }: PathCompletionBarsProps) {
  if (byPath.length === 0) {
    return <p className="text-sm text-paper-300 italic">No path data available.</p>;
  }

  const sorted = [...byPath].sort((a, b) => b.completionRate - a.completionRate);

  return (
    <ul className="space-y-3">
      {sorted.map((path) => {
        const pct = Math.round(path.completionRate * 100);
        return (
          <li key={path.learningPathId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-paper-100 truncate max-w-[60%]" title={path.title}>
                {path.title}
              </span>
              <span className="text-paper-300 tabular-nums">
                {pct}%<span className="ml-1.5 text-xs">({path.assignedCount} assigned)</span>
              </span>
            </div>
            <AnimatedProgressBar
              value={path.completionRate}
              label={`${path.title} completion: ${pct}%`}
            />
          </li>
        );
      })}
    </ul>
  );
}
