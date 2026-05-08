'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@levelup/ui';
import { cn } from '@levelup/ui';

const CATEGORIES = [
  { value: 'all', label: 'All categories' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Support', label: 'Support' },
  { value: 'HR', label: 'HR' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Exec', label: 'Exec' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'General', label: 'General' },
] as const;

const BASE_SCOPES = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'org', label: 'Org' },
  { value: 'library', label: 'Library' },
] as const;

type BaseScopeValue = (typeof BASE_SCOPES)[number]['value'];
type ScopeValue = BaseScopeValue | 'dept';

interface PromptFiltersProps {
  q: string;
  category: string;
  scope: string;
  /** When provided, inserts a "Department" pill between Mine and Org. */
  hasDepartment?: boolean;
}

export function PromptFilters({ q, category, scope, hasDepartment = false }: PromptFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap',
        isPending && 'opacity-60 pointer-events-none',
      )}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-paper-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <Input
          type="search"
          placeholder="Search prompts..."
          defaultValue={q}
          className="pl-9"
          onChange={(e) => {
            const val = e.target.value;
            clearTimeout(
              (window as typeof window & { _promptSearchTimer?: ReturnType<typeof setTimeout> })
                ._promptSearchTimer,
            );
            (
              window as typeof window & { _promptSearchTimer?: ReturnType<typeof setTimeout> }
            )._promptSearchTimer = setTimeout(() => update('q', val), 300);
          }}
        />
      </div>

      {/* Category */}
      <Select defaultValue={category || 'all'} onValueChange={(val) => update('category', val)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Scope pills */}
      <div
        className="flex items-center gap-1 rounded-lg border border-ink-600 p-1"
        role="group"
        aria-label="Filter by scope"
      >
        {((): { value: ScopeValue; label: string }[] => {
          const pills: { value: ScopeValue; label: string }[] = [
            { value: 'all', label: 'All' },
            { value: 'mine', label: 'Mine' },
          ];
          if (hasDepartment) {
            pills.push({ value: 'dept', label: 'Department' });
          }
          pills.push({ value: 'org', label: 'Org' });
          pills.push({ value: 'library', label: 'Library' });
          return pills;
        })().map((s) => {
          const isActive = (scope || 'all') === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => update('scope', s.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-signal text-ink-900 shadow-sm'
                  : 'text-paper-300 hover:bg-ink-700 hover:text-paper-100',
              )}
              aria-pressed={isActive}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
