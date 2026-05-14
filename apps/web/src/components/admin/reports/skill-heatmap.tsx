'use client';

import * as React from 'react';
import type { TeamSkillHeatmap } from '@/lib/api/skills';

interface SkillHeatmapProps {
  data: TeamSkillHeatmap;
  /** Max skills (columns) to show. Defaults to 12 — keeps the table readable. */
  topSkills?: number;
}

function cellStyle(composite: number): string {
  if (composite >= 0.85) return 'bg-signal text-ink-900';
  if (composite >= 0.7) return 'bg-signal/75 text-ink-900';
  if (composite >= 0.55) return 'bg-signal/55 text-ink-900';
  if (composite >= 0.4) return 'bg-signal/35 text-paper-100';
  if (composite >= 0.25) return 'bg-ink-700 text-paper-100';
  if (composite > 0) return 'bg-ink-700 text-paper-300';
  return 'bg-ink-800 text-paper-500';
}

export function SkillHeatmap({ data, topSkills = 12 }: SkillHeatmapProps) {
  const { users, skills, cells } = data;

  // Pick the skills with the most non-zero cells across the org — those are
  // the ones that will actually carry signal in the matrix.
  const coverageBySkill = new Map<string, number>();
  for (const c of cells) {
    if (c.composite > 0) {
      coverageBySkill.set(c.skillId, (coverageBySkill.get(c.skillId) ?? 0) + 1);
    }
  }
  const visibleSkills = [...skills]
    .sort((a, b) => (coverageBySkill.get(b.skillId) ?? 0) - (coverageBySkill.get(a.skillId) ?? 0))
    .slice(0, topSkills);
  const visibleSkillIds = new Set(visibleSkills.map((s) => s.skillId));

  const cellByKey = React.useMemo(() => {
    const map = new Map<string, (typeof cells)[number]>();
    for (const c of cells) {
      if (!visibleSkillIds.has(c.skillId)) continue;
      map.set(`${c.userId}::${c.skillId}`, c);
    }
    return map;
  }, [cells, visibleSkillIds]);

  if (users.length === 0 || visibleSkills.length === 0) {
    return (
      <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        NO SKILL DATA AVAILABLE
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-max border-collapse text-body-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[180px] bg-ink-800 px-3 py-2 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Member
              </th>
              {visibleSkills.map((s) => (
                <th
                  key={s.skillId}
                  className="max-w-[120px] px-2 py-2 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500"
                >
                  <span title={s.name} className="block max-w-[110px] truncate">
                    {s.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600">
            {users.map((u) => (
              <tr key={u.userId} className="transition-colors hover:bg-ink-800">
                <td className="sticky left-0 z-10 bg-ink-900 px-3 py-2 text-body-sm font-medium text-paper-100">
                  <div className="space-y-0.5">
                    <p>{u.userName || u.email}</p>
                    {u.departmentName && (
                      <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                        {u.departmentName}
                      </p>
                    )}
                  </div>
                </td>
                {visibleSkills.map((s) => {
                  const cell = cellByKey.get(`${u.userId}::${s.skillId}`);
                  const composite = cell?.composite ?? 0;
                  return (
                    <td key={s.skillId} className="px-1.5 py-1.5 text-center">
                      <div
                        className={`rounded-data px-2 py-1.5 font-mono text-mono-sm font-semibold tabular-nums transition-colors ${cellStyle(composite)}`}
                        title={
                          cell
                            ? `${s.name}: ${Math.round(composite * 100)}% (exposure ${Math.round(cell.exposure * 100)}%, practice ${Math.round(cell.practice * 100)}%, transfer ${Math.round(cell.transfer * 100)}%)`
                            : `${s.name}: no signal yet`
                        }
                      >
                        {composite > 0 ? Math.round(composite * 100) : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        <span>MASTERY:</span>
        {[
          { label: 'NONE', cls: 'bg-ink-800' },
          { label: '<25%', cls: 'bg-ink-700' },
          { label: '25–40%', cls: 'bg-signal/35' },
          { label: '40–55%', cls: 'bg-signal/55' },
          { label: '55–70%', cls: 'bg-signal/75' },
          { label: '70%+', cls: 'bg-signal' },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-5 rounded-data border border-ink-600 ${cls}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
