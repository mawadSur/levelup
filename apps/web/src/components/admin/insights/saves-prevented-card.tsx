import type { SavesPreventedResponse } from '@levelup/types';
import { Card, CardContent, CardHeader, CardTitle } from '@levelup/ui';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';

interface SavesPreventedCardProps {
  data: SavesPreventedResponse;
}

export function SavesPreventedCard({ data }: SavesPreventedCardProps) {
  const maxCount = Math.max(...data.byCategory.map((c) => c.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Saves Prevented</CardTitle>
        <p className="text-xs text-paper-300">
          Sensitive data caught before it left your org — last 30 days.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Big headline numbers */}
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-4xl font-bold tabular-nums text-paper-100">{data.totalDetections}</p>
            <p className="text-xs text-paper-300 mt-1">potential leaks caught</p>
          </div>
          <div>
            <p className="text-4xl font-bold tabular-nums text-paper-100">
              {data.uniqueUsersAffected}
            </p>
            <p className="text-xs text-paper-300 mt-1">users protected</p>
          </div>
        </div>

        {/* Category breakdown */}
        {data.byCategory.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-paper-300 uppercase tracking-wider mb-3">
              By category
            </p>
            <Stagger className="space-y-2">
              {data.byCategory.map((cat) => {
                const pct = Math.round((cat.count / maxCount) * 100);
                return (
                  <ScrollItem key={cat.category}>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 capitalize truncate text-paper-300">
                        {cat.category}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-ink-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-danger/70 transition-[width] duration-500"
                          style={{ width: `${pct}%` }}
                          aria-valuenow={cat.count}
                          role="progressbar"
                        />
                      </div>
                      <span className="tabular-nums text-xs font-semibold text-paper-100 w-8 text-right">
                        {cat.count}
                      </span>
                    </div>
                  </ScrollItem>
                );
              })}
            </Stagger>
          </div>
        )}

        {/* Recent examples */}
        {data.recentExamples.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-paper-300 uppercase tracking-wider mb-3">
              Recent examples (anonymised)
            </p>
            <div className="space-y-1.5">
              {data.recentExamples.map((ex, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-paper-300"
                >
                  <span className="font-medium text-paper-100">{ex.userName}</span>
                  <span className="opacity-40">·</span>
                  <span>{new Date(ex.occurredAt).toLocaleDateString()}</span>
                  <span className="opacity-40">·</span>
                  <span className="italic">{ex.categories.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.totalDetections === 0 && (
          <p className="text-sm text-paper-300">
            No sensitive data detections in the last 30 days.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
