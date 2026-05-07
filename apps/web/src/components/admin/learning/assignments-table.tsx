'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { Badge, Input, Progress } from '@levelup/ui';
import type { User } from '@/lib/api/users';
import type { LearningPath } from '@/lib/api/paths';
import type { Department } from '@/lib/api/departments';

// ---------------------------------------------------------------------------
// Row shape built from API data
// ---------------------------------------------------------------------------

interface AssignmentRow {
  user: User;
  pathsAssigned: LearningPath[];
  lastActivity: string | null;
  completionPct: number;
}

// ---------------------------------------------------------------------------
// Sort/filter state
// ---------------------------------------------------------------------------

type SortKey = 'name' | 'paths' | 'completion';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssignmentsTableProps {
  users: User[];
  paths: LearningPath[];
  departments: Department[];
}

// ---------------------------------------------------------------------------
// Build synthetic assignment rows (in a real app these come from the API)
// ---------------------------------------------------------------------------

function buildRows(users: User[], paths: LearningPath[]): AssignmentRow[] {
  return users.map((u) => {
    // Seed deterministic assignment data
    const hash = u.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const assignedCount = hash % (paths.length + 1);
    const assigned = paths.slice(0, assignedCount);
    const pct = assignedCount === 0 ? 0 : Math.round(hash % 101);
    return {
      user: u,
      pathsAssigned: assigned,
      lastActivity: u.lastActiveAt,
      completionPct: pct,
    };
  });
}

function SortIcon({ col, sort, dir }: { col: SortKey; sort: SortKey; dir: SortDir }) {
  if (sort !== col) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
  return dir === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );
}

export function AssignmentsTable({ users, paths, departments }: AssignmentsTableProps) {
  const [search, setSearch] = React.useState('');
  const [deptFilter, setDeptFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'assigned' | 'unassigned'>('all');
  const [sort, setSort] = React.useState<SortKey>('name');
  const [dir, setDir] = React.useState<SortDir>('asc');

  const rows = React.useMemo(() => buildRows(users, paths), [users, paths]);

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !search ||
        r.user.name.toLowerCase().includes(search.toLowerCase()) ||
        r.user.email.toLowerCase().includes(search.toLowerCase());
      const matchDept = !deptFilter || r.user.departmentId === deptFilter;
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'assigned'
            ? r.pathsAssigned.length > 0
            : r.pathsAssigned.length === 0;
      return matchSearch && matchDept && matchStatus;
    });
  }, [rows, search, deptFilter, statusFilter]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort === 'name') cmp = a.user.name.localeCompare(b.user.name);
      else if (sort === 'paths') cmp = a.pathsAssigned.length - b.pathsAssigned.length;
      else cmp = a.completionPct - b.completionPct;
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort, dir]);

  function toggleSort(key: SortKey) {
    if (sort === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDir('asc');
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'assigned' | 'unassigned')}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          aria-label="Filter by assignment status"
        >
          <option value="all">All statuses</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th
                  className="cursor-pointer select-none px-4 py-3 text-left font-semibold"
                  onClick={() => toggleSort('name')}
                >
                  <span className="flex items-center gap-1">
                    User
                    <SortIcon col="name" sort={sort} dir={dir} />
                  </span>
                </th>
                <th
                  className="cursor-pointer select-none px-4 py-3 text-left font-semibold"
                  onClick={() => toggleSort('paths')}
                >
                  <span className="flex items-center gap-1">
                    Paths assigned
                    <SortIcon col="paths" sort={sort} dir={dir} />
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-semibold">Last activity</th>
                <th
                  className="cursor-pointer select-none px-4 py-3 text-left font-semibold"
                  onClick={() => toggleSort('completion')}
                >
                  <span className="flex items-center gap-1">
                    Completion
                    <SortIcon col="completion" sort={sort} dir={dir} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No learners match your filters.
                  </td>
                </tr>
              ) : (
                sorted.map((row) => (
                  <tr
                    key={row.user.id}
                    className="bg-background hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{row.user.name}</p>
                      <p className="text-xs text-muted-foreground">{row.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.pathsAssigned.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.pathsAssigned.slice(0, 2).map((p) => (
                            <Badge key={p.id} variant="secondary" className="text-xs">
                              {p.title}
                            </Badge>
                          ))}
                          {row.pathsAssigned.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{row.pathsAssigned.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(row.lastActivity)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={row.completionPct} className="h-1.5 w-24" />
                        <span className="text-xs text-muted-foreground">{row.completionPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {sorted.length} of {rows.length} learners
      </p>
    </div>
  );
}
