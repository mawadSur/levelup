import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@levelup/ui';
import type { UserSkillRow } from '@/lib/api/skills';

interface SkillPostureCardProps {
  rows: UserSkillRow[];
  /** True when /skills/me rejected — show a soft error state instead of empty. */
  loadFailed?: boolean;
}

const TOP_N = 8;

function pct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'Beginner',
    PRACTITIONER: 'Practitioner',
    POWER_USER: 'Power User',
    CHAMPION: 'Champion',
  };
  return map[tier] ?? tier;
}

export function SkillPostureCard({ rows, loadFailed = false }: SkillPostureCardProps) {
  const top = [...rows].sort((a, b) => b.composite - a.composite).slice(0, TOP_N);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Skill posture</CardTitle>
        <CardDescription>
          How much you have seen, practiced, and applied each skill on the job.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadFailed ? (
          <div className="rounded-lg border border-dashed border-danger/40 bg-danger/10 p-6 text-center">
            <p className="text-sm text-danger">
              Could not load your skill posture. Refresh in a minute — the daily aggregator runs at
              04:00 UTC and your first row may not be ready yet.
            </p>
          </div>
        ) : top.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-600 p-6 text-center">
            <p className="text-sm text-paper-300">
              Complete a lesson or pass a lab to start building your skill posture. New rows appear
              after the next aggregator run.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-4">
              {top.map((row) => (
                <li key={row.skillId} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-paper-100">{row.name}</p>
                      <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                        {tierLabel(row.tier)}
                      </p>
                    </div>
                    <span className="font-mono text-mono-sm tabular-nums text-paper-300">
                      {pct(row.composite)}%
                    </span>
                  </div>
                  <div
                    className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink-700"
                    role="img"
                    aria-label={`${row.name}: ${pct(row.exposure)}% exposure, ${pct(row.practice)}% practice, ${pct(row.transfer)}% transfer`}
                  >
                    <div
                      className="h-full bg-paper-300"
                      style={{ width: `${pct(row.exposure) / 3}%` }}
                      title={`Exposure ${pct(row.exposure)}%`}
                    />
                    <div
                      className="h-full bg-signal/70"
                      style={{ width: `${pct(row.practice) / 3}%` }}
                      title={`Practice ${pct(row.practice)}%`}
                    />
                    <div
                      className="h-full bg-signal"
                      style={{ width: `${pct(row.transfer) / 3}%` }}
                      title={`Transfer ${pct(row.transfer)}%`}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-full bg-paper-300" /> Exposure
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-full bg-signal/70" /> Practice
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-full bg-signal" /> Transfer
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
