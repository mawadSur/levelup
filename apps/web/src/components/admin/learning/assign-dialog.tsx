'use client';

import * as React from 'react';
import { Search, X, Loader2, Check } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Badge,
  Separator,
  toast,
} from '@levelup/ui';
import { paths } from '@/lib/api';
import type { LearningPath } from '@/lib/api/paths';
import type { User } from '@/lib/api/users';
import type { Department } from '@/lib/api/departments';

interface AssignDialogProps {
  path: LearningPath | null;
  users: User[];
  departments: Department[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignDialog({ path, users, departments, open, onOpenChange }: AssignDialogProps) {
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [filterDept, setFilterDept] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIds(new Set());
      setFilterDept('');
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !filterDept || u.departmentId === filterDept;
      return matchesSearch && matchesDept && u.isActive;
    });
  }, [users, search, filterDept]);

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectDept(deptId: string) {
    const deptUsers = users.filter((u) => u.departmentId === deptId && u.isActive);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      deptUsers.forEach((u) => next.add(u.id));
      return next;
    });
  }

  async function handleAssign() {
    if (!path || selectedIds.size === 0) return;
    setLoading(true);
    try {
      const result = await paths.assignPath({
        learningPathId: path.id,
        userIds: Array.from(selectedIds),
      });
      toast({ title: `Assigned to ${result.assigned} learner(s).` });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Assignment failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign path</DialogTitle>
          <DialogDescription>
            {path?.title} — select people or a department to assign
          </DialogDescription>
        </DialogHeader>

        {/* Department quick-add */}
        {departments.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-paper-300 uppercase tracking-wide">
              Add whole department
            </p>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => selectDept(d.id)}
                  className="rounded-full border border-ink-600 px-3 py-0.5 text-xs hover:bg-ink-700 transition-colors"
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-paper-300" />
            <Input
              placeholder="Search people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="rounded-md border border-ink-600 bg-ink-900 px-2 text-sm text-paper-100"
            aria-label="Filter by department"
          >
            <option value="">All depts</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selected badges */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selectedIds)
              .slice(0, 6)
              .map((id) => {
                const u = users.find((x) => x.id === id);
                return u ? (
                  <Badge key={id} variant="secondary" className="gap-1 pr-1">
                    {u.name}
                    <button
                      type="button"
                      onClick={() => toggleUser(id)}
                      className="ml-0.5 rounded-full hover:bg-ink-700"
                      aria-label={`Remove ${u.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            {selectedIds.size > 6 && <Badge variant="outline">+{selectedIds.size - 6} more</Badge>}
          </div>
        )}

        {/* User list */}
        <div className="max-h-60 overflow-y-auto rounded-md border border-ink-600">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-paper-300">No users found</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((u) => {
                const selected = selectedIds.has(u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-ink-700/50 transition-colors"
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          selected ? 'border-indigo-600 bg-indigo-600' : 'border-ink-600'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-paper-300">{u.email}</p>
                      </div>
                      {u.departmentId && (
                        <span className="text-xs text-paper-300">
                          {departments.find((d) => d.id === u.departmentId)?.name}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || selectedIds.size === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning…
              </>
            ) : (
              `Assign to ${selectedIds.size} ${selectedIds.size === 1 ? 'person' : 'people'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
