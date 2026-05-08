import { Progress } from '@levelup/ui';
import { cn } from '@/lib/utils';

interface BarItem {
  name: string;
  value: number;
  max: number;
  sublabel?: string;
}

interface DeptBarListProps {
  items: BarItem[];
  className?: string;
}

export function DeptBarList({ items, className }: DeptBarListProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-paper-300">No data available.</p>;
  }

  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => {
        const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
        return (
          <li key={item.name} className="group">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-paper-100">{item.name}</span>
              <div className="flex shrink-0 items-center gap-2">
                {item.sublabel && <span className="text-xs text-paper-300">{item.sublabel}</span>}
                <span className="w-9 text-right text-xs font-semibold tabular-nums text-paper-100">
                  {pct}%
                </span>
              </div>
            </div>
            <Progress value={pct} className="h-2" aria-label={`${item.name}: ${pct}%`} />
          </li>
        );
      })}
    </ul>
  );
}
