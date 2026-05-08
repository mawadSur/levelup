'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@levelup/ui';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'This week active' },
  { value: 'stalled', label: 'Stalled' },
] as const;

interface TeamFilterPillsProps {
  activeFilter: string;
}

export function TeamFilterPills({ activeFilter }: TeamFilterPillsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-lg border border-ink-600 p-1 w-fit',
        isPending && 'opacity-60 pointer-events-none',
      )}
      role="group"
      aria-label="Filter team members"
    >
      {FILTERS.map((f) => {
        const isActive = (activeFilter || 'all') === f.value;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-signal text-ink-900 shadow-sm'
                : 'text-paper-300 hover:bg-ink-700 hover:text-paper-100',
            )}
            aria-pressed={isActive}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
