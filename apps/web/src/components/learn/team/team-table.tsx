import { Avatar, AvatarFallback, Badge, Button } from '@levelup/ui';
import { SuggestPathDialog } from './suggest-path-dialog';
import type { User } from '@/lib/api/users';
import type { TeamProgressEntry } from '@/lib/api/progress';
import type { LearningPath } from '@/lib/api/paths';

interface TeamTableProps {
  users: User[];
  /** Map keyed by userId → bulk progress aggregate from `/progress/team`. */
  progressMap: Map<string, TeamProgressEntry>;
  availablePaths: LearningPath[];
  activeFilter: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatLastActive(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function aiLevelLabel(level: string | null): string {
  if (!level) return 'Not assessed';
  const map: Record<string, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
  };
  return map[level] ?? level;
}

function aiLevelVariant(level: string | null): 'default' | 'secondary' | 'outline' {
  if (level === 'ADVANCED') return 'default';
  if (level === 'INTERMEDIATE') return 'secondary';
  return 'outline';
}

function isStalled(progress: TeamProgressEntry | undefined): boolean {
  if (!progress || progress.assignedPaths === 0) return false;
  if (!progress.lastActiveAt) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(progress.lastActiveAt).getTime() > sevenDaysMs;
}

function isActiveThisWeek(user: User): boolean {
  if (!user.lastActiveAt) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(user.lastActiveAt).getTime() < sevenDaysMs;
}

export function TeamTable({ users, progressMap, availablePaths, activeFilter }: TeamTableProps) {
  const filtered = users.filter((u) => {
    if (activeFilter === 'active') return isActiveThisWeek(u);
    if (activeFilter === 'stalled') return isStalled(progressMap.get(u.id));
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">No team members match this filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
              Member
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell"
            >
              AI Level
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell"
            >
              Last active
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell"
            >
              Completion
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {filtered.map((user) => {
            const progress = progressMap.get(user.id);
            const completionPct = progress ? Math.round(progress.completionRate * 100) : 0;
            const displayName = user.name || user.email;

            return (
              <tr key={user.id} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <Badge variant={aiLevelVariant(user.aiLevel)} className="text-xs">
                    {aiLevelLabel(user.aiLevel)}
                  </Badge>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {formatLastActive(user.lastActiveAt)}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{completionPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <SuggestPathDialog
                    userId={user.id}
                    userName={displayName}
                    availablePaths={availablePaths}
                    trigger={
                      <Button variant="outline" size="sm">
                        Suggest path
                      </Button>
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
