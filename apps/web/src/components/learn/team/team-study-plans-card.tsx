import { Badge, Card, CardContent, MonoLabel, Progress } from '@levelup/ui';
import type { TeamStudyPlanRow } from '@/lib/api/study-plan';

interface TeamStudyPlansCardProps {
  rows: TeamStudyPlanRow[];
}

/**
 * Manager-view "Study Plans" card. One row per direct-report with:
 *  - current-week progress bar (% complete)
 *  - behind / on_track / ahead indicator
 *
 * Renders an empty-state placeholder when no rows are returned. The data is
 * server-fetched and passed in as a prop so this remains a server component.
 */
export function TeamStudyPlansCard({ rows }: TeamStudyPlansCardProps) {
  return (
    <Card data-testid="team-study-plans-card">
      <CardContent className="space-y-4 p-6">
        <header className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <MonoLabel tone="signal">STUDY PLANS</MonoLabel>
            <h2 className="font-serif text-h3 italic text-paper-100">This week&apos;s plans</h2>
          </div>
          <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            {rows.length} REPORT{rows.length === 1 ? '' : 'S'}
          </p>
        </header>

        {rows.length === 0 ? (
          <p className="text-body-sm text-paper-400">
            No direct reports yet. Invite teammates to see their study-plan progress here.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.userId}
                className="flex flex-col gap-3 rounded-md border border-paper-800/30 bg-ink-800/30 p-4 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-body-sm text-paper-100">{row.name}</p>
                  <p className="truncate font-mono text-mono-2xs uppercase tracking-[0.06em] text-paper-500">
                    {row.email}
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  {row.hasPlan ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 font-mono text-mono-2xs uppercase tracking-[0.06em] text-paper-500">
                        <span>
                          {row.doneItems}/{row.totalItems} DONE
                        </span>
                        <span>{Math.round(row.progress * 100)}%</span>
                      </div>
                      <Progress value={Math.round(row.progress * 100)} />
                    </div>
                  ) : (
                    <p className="font-mono text-mono-2xs uppercase tracking-[0.06em] text-paper-500">
                      NO PLAN YET
                    </p>
                  )}
                </div>
                <IndicatorBadge indicator={row.indicator} hasPlan={row.hasPlan} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function IndicatorBadge({
  indicator,
  hasPlan,
}: {
  indicator: TeamStudyPlanRow['indicator'];
  hasPlan: boolean;
}) {
  if (!hasPlan) {
    return (
      <Badge variant="outline" className="shrink-0">
        Awaiting baseline
      </Badge>
    );
  }
  if (indicator === 'ahead') {
    return (
      <Badge variant="default" className="shrink-0">
        Ahead
      </Badge>
    );
  }
  if (indicator === 'behind') {
    return (
      <Badge variant="destructive" className="shrink-0">
        Behind
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="shrink-0">
      On track
    </Badge>
  );
}
