import type { DeptHeatmapCell } from '@/lib/api/reports';

interface SkillsHeatmapProps {
  cells: DeptHeatmapCell[];
}

// ---------------------------------------------------------------------------
// Build matrix from flat cells
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Color scaling — indigo intensity by completion rate
// ---------------------------------------------------------------------------

function cellColor(rate: number): string {
  if (rate >= 0.9) return 'bg-indigo-900 text-white';
  if (rate >= 0.75) return 'bg-indigo-700 text-white';
  if (rate >= 0.6) return 'bg-indigo-500 text-white';
  if (rate >= 0.45) return 'bg-indigo-300 text-indigo-900';
  if (rate >= 0.3) return 'bg-indigo-200 text-indigo-900';
  if (rate >= 0.15) return 'bg-indigo-100 text-indigo-900';
  return 'bg-indigo-50 text-indigo-900';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SkillsHeatmap({ cells }: SkillsHeatmapProps) {
  if (cells.length === 0) {
    return <p className="text-sm text-paper-300 italic">No heatmap data available.</p>;
  }

  const { departments, paths, grid } = buildMatrix(cells);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-max text-xs border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-ink-900 px-3 py-2 text-left font-semibold text-paper-300 min-w-[140px]">
                Department
              </th>
              {paths.map((p) => (
                <th
                  key={p}
                  className="px-3 py-2 text-center font-semibold text-paper-300 max-w-[120px]"
                >
                  <span title={p} className="block truncate max-w-[100px]">
                    {p}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-center font-semibold text-paper-300">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {departments.map((dept, deptIdx) => {
              const rowCells = grid[deptIdx] ?? [];
              const total = rowCells.reduce((sum, c) => sum + (c?.memberCount ?? 0), 0);
              return (
                <tr key={dept} className="hover:bg-ink-700/30 transition-colors">
                  <td className="sticky left-0 z-10 bg-ink-900 px-3 py-2 font-medium text-paper-100">
                    {dept}
                  </td>
                  {rowCells.map((cell, pathIdx) => (
                    <td key={pathIdx} className="px-1.5 py-1.5 text-center">
                      {cell ? (
                        <div
                          className={`rounded px-2 py-1.5 font-semibold tabular-nums transition-colors ${cellColor(cell.completionRate)}`}
                          title={`${Math.round(cell.completionRate * 100)}% completion · ${cell.memberCount} members`}
                        >
                          {cell.memberCount}
                        </div>
                      ) : (
                        <div className="rounded bg-ink-700/40 px-2 py-1.5 text-paper-300/40">—</div>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold tabular-nums text-paper-100">
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="border-t-2 border-ink-600 bg-ink-700/30">
              <td className="sticky left-0 z-10 bg-ink-700/30 px-3 py-2 font-semibold text-paper-100">
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
                    className="px-3 py-2 text-center font-semibold tabular-nums text-paper-100"
                  >
                    {colTotal}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold tabular-nums text-paper-100">
                {cells.reduce((sum, c) => sum + c.memberCount, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-paper-300">
        <span>Completion rate:</span>
        {[
          { label: '0–15%', cls: 'bg-indigo-50' },
          { label: '15–30%', cls: 'bg-indigo-100' },
          { label: '30–45%', cls: 'bg-indigo-200' },
          { label: '45–60%', cls: 'bg-indigo-300' },
          { label: '60–75%', cls: 'bg-indigo-500' },
          { label: '75–90%', cls: 'bg-indigo-700' },
          { label: '90%+', cls: 'bg-indigo-900' },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-5 rounded ${cls} border border-ink-600`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
