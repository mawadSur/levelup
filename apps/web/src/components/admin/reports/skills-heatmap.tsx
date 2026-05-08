import type { DeptHeatmapCell } from '@/lib/api/reports';

interface SkillsHeatmapProps {
  cells: DeptHeatmapCell[];
}

interface MatrixData {
  departments: string[];
  paths: string[];
  grid: (DeptHeatmapCell | null)[][];
}

function buildMatrix(cells: DeptHeatmapCell[]): MatrixData {
  const deptOrder: string[] = [];
  const pathOrder: string[] = [];

  for (const c of cells) {
    if (!deptOrder.includes(c.departmentName)) deptOrder.push(c.departmentName);
    if (!pathOrder.includes(c.pathTitle)) pathOrder.push(c.pathTitle);
  }

  const grid: (DeptHeatmapCell | null)[][] = deptOrder.map((dept) =>
    pathOrder.map(
      (path) => cells.find((c) => c.departmentName === dept && c.pathTitle === path) ?? null,
    ),
  );

  return { departments: deptOrder, paths: pathOrder, grid };
}

/**
 * Heatmap cell intensity — danger at low completion, paper-100 mid, signal at high.
 * The hierarchy reads "more amber = better" without leaving the Mission Brief palette.
 */
function cellStyle(rate: number): string {
  if (rate >= 0.9) return 'bg-signal text-ink-900';
  if (rate >= 0.75) return 'bg-signal/75 text-ink-900';
  if (rate >= 0.6) return 'bg-signal/55 text-ink-900';
  if (rate >= 0.45) return 'bg-signal/35 text-paper-100';
  if (rate >= 0.3) return 'bg-ink-700 text-paper-100';
  if (rate >= 0.15) return 'bg-ink-700 text-paper-300';
  return 'bg-danger/30 text-paper-100';
}

export function SkillsHeatmap({ cells }: SkillsHeatmapProps) {
  if (cells.length === 0) {
    return (
      <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        NO HEATMAP DATA AVAILABLE
      </p>
    );
  }

  const { departments, paths, grid } = buildMatrix(cells);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-max border-collapse text-body-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[140px] bg-ink-800 px-3 py-2 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Department
              </th>
              {paths.map((p) => (
                <th
                  key={p}
                  className="max-w-[120px] px-3 py-2 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500"
                >
                  <span title={p} className="block max-w-[100px] truncate">
                    {p}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600">
            {departments.map((dept, deptIdx) => {
              const rowCells = grid[deptIdx] ?? [];
              const total = rowCells.reduce((sum, c) => sum + (c?.memberCount ?? 0), 0);
              return (
                <tr key={dept} className="transition-colors hover:bg-ink-800">
                  <td className="sticky left-0 z-10 bg-ink-900 px-3 py-2 text-body-sm font-medium text-paper-100">
                    {dept}
                  </td>
                  {rowCells.map((cell, pathIdx) => (
                    <td key={pathIdx} className="px-1.5 py-1.5 text-center">
                      {cell ? (
                        <div
                          className={`rounded-data px-2 py-1.5 font-mono text-mono-sm font-semibold tabular-nums transition-colors ${cellStyle(cell.completionRate)}`}
                          title={`${Math.round(cell.completionRate * 100)}% completion · ${cell.memberCount} members`}
                        >
                          {cell.memberCount}
                        </div>
                      ) : (
                        <div className="rounded-data bg-ink-700 px-2 py-1.5 font-mono text-mono-sm text-paper-500">
                          —
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-mono text-mono-sm font-semibold tabular-nums text-paper-100">
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink-600 bg-ink-800">
              <td className="sticky left-0 z-10 bg-ink-800 px-3 py-2 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-100">
                Totals
              </td>
              {paths.map((_, pathIdx) => {
                const colTotal = grid.reduce(
                  (sum, row) => sum + (row[pathIdx]?.memberCount ?? 0),
                  0,
                );
                return (
                  <td
                    key={pathIdx}
                    className="px-3 py-2 text-center font-mono text-mono-sm font-semibold tabular-nums text-paper-100"
                  >
                    {colTotal}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-mono text-mono-sm font-bold tabular-nums text-signal">
                {cells.reduce((sum, c) => sum + c.memberCount, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        <span>COMPLETION:</span>
        {[
          { label: '<15%', cls: 'bg-danger/30' },
          { label: '15–30%', cls: 'bg-ink-700' },
          { label: '30–45%', cls: 'bg-signal/35' },
          { label: '45–60%', cls: 'bg-signal/55' },
          { label: '60–75%', cls: 'bg-signal/75' },
          { label: '75–90%', cls: 'bg-signal/75' },
          { label: '90%+', cls: 'bg-signal' },
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
