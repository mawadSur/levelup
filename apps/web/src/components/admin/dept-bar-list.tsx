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

/**
 * Dense ranked bar list used on the admin dashboard for department / activity
 * breakdowns. Mono-tracked numerals on the right, signal-amber fill, sharp
 * (rounded-data) bar — sits inside a Card.
 */
export function DeptBarList({ items, className }: DeptBarListProps) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        NO DATA
      </p>
    );
  }

  return (
    <ul className={cn('divide-y divide-ink-600', className)}>
      {items.map((item) => {
        const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
        return (
          <li key={item.name} className="py-3 first:pt-0 last:pb-0">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="truncate text-body-sm font-medium text-paper-100">{item.name}</span>
              <div className="flex shrink-0 items-center gap-3 font-mono text-mono-sm tabular-nums">
                {item.sublabel && (
                  <span className="uppercase tracking-[0.05em] text-paper-500">
                    {item.sublabel}
                  </span>
                )}
                <span className="w-10 text-right text-paper-100">{pct}%</span>
              </div>
            </div>
            <div
              className="h-1 w-full overflow-hidden rounded-data bg-ink-700"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${item.name}: ${pct}%`}
            >
              <div
                className="h-full rounded-data bg-signal transition-[width] duration-500 ease-mission"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
