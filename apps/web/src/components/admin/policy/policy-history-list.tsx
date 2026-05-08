import { Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@levelup/ui';
import type { PolicyVersion } from '@/lib/api/policies';

interface PolicyHistoryListProps {
  policies: PolicyVersion[];
  currentId: string | null;
  onSelect?: (id: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Server component — renders a list of policy versions with dates.
 * onSelect is only needed on the client; this component is pure display.
 */
export function PolicyHistoryList({ policies, currentId }: PolicyHistoryListProps) {
  if (policies.length === 0) {
    return <p className="text-sm text-paper-300 italic">No previous versions.</p>;
  }

  const sorted = [...policies].sort((a, b) => b.version - a.version);

  return (
    <ol className="space-y-1">
      {sorted.map((p) => {
        const isCurrent = p.id === currentId;
        return (
          <li
            key={p.id}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              isCurrent ? 'bg-signal/10 dark:bg-ink-800/30' : 'hover:bg-ink-700/50'
            }`}
          >
            {isCurrent ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-signal" />
            ) : (
              <Clock className="h-4 w-4 shrink-0 text-paper-300" />
            )}
            <div className="min-w-0 flex-1">
              <span className="font-medium">v{p.version}</span>
              {p.publishedAt && (
                <span className="ml-2 text-xs text-paper-300">{formatDate(p.publishedAt)}</span>
              )}
            </div>
            {isCurrent && (
              <Badge variant="secondary" className="text-xs">
                Current
              </Badge>
            )}
            {p.isPublished && !isCurrent && (
              <Badge variant="outline" className="text-xs">
                Published
              </Badge>
            )}
          </li>
        );
      })}
    </ol>
  );
}
