import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@levelup/ui';
import type { TeamProgressEntry } from '@/lib/api/progress';
import type { User } from '@/lib/api/users';

interface CoachingSuggestionsProps {
  users: User[];
  progressMap: Map<string, TeamProgressEntry>;
}

interface Suggestion {
  userId: string;
  userName: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

/**
 * Heuristic-based coaching suggestions. Rules applied in order:
 * 1. User has not been assigned any path → "Not started"
 * 2. User has at least one assigned path but lastActiveAt is 7+ days old → "Stalled"
 * 3. Overall completion rate < 25% → "Low progress"
 *
 * Heuristics run server-side off the bulk progress payload (one fetch for the
 * whole team) — see `/progress/team`.
 */
function deriveSuggestions(
  userList: User[],
  progressMap: Map<string, TeamProgressEntry>,
): Suggestion[] {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const suggestions: Suggestion[] = [];

  for (const user of userList) {
    const prog = progressMap.get(user.id);
    const name = user.name || user.email;

    if (!prog || prog.assignedPaths === 0) {
      suggestions.push({
        userId: user.id,
        userName: name,
        reason: 'Has not been assigned any learning path.',
        severity: 'high',
      });
      continue;
    }

    if (prog.lastActiveAt) {
      const lastActivity = new Date(prog.lastActiveAt).getTime();
      if (now - lastActivity > sevenDaysMs) {
        const weeks = Math.floor((now - lastActivity) / sevenDaysMs);
        suggestions.push({
          userId: user.id,
          userName: name,
          reason: `No activity for ${weeks} week(s).`,
          severity: 'medium',
        });
        continue;
      }
    }

    if (prog.completionRate < 0.25) {
      suggestions.push({
        userId: user.id,
        userName: name,
        reason: `Overall completion is below 25% (${Math.round(prog.completionRate * 100)}%).`,
        severity: 'low',
      });
    }
  }

  // Return at most 5 suggestions, prioritised by severity
  const order = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 5);
}

const severityVariant: Record<Suggestion['severity'], 'default' | 'secondary' | 'outline'> = {
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

const severityLabel: Record<Suggestion['severity'], string> = {
  high: 'Needs attention',
  medium: 'Stalled',
  low: 'Low progress',
};

export function CoachingSuggestions({ users, progressMap }: CoachingSuggestionsProps) {
  const suggestions = deriveSuggestions(users, progressMap);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coaching opportunities</CardTitle>
        <CardDescription>
          Team members who may benefit from a nudge, based on activity patterns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Your team is on track. No immediate coaching opportunities detected.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border" role="list">
            {suggestions.map((s) => (
              <li
                key={s.userId}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.userName}</p>
                  <p className="text-xs text-muted-foreground">{s.reason}</p>
                </div>
                <Badge variant={severityVariant[s.severity]} className="shrink-0 text-xs w-fit">
                  {severityLabel[s.severity]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
