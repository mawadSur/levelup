'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed?: boolean;
  /** Optional badge text — shown as a small mono pill beside the label. */
  badge?: string;
}

/**
 * Admin sidebar nav item. Active state renders a 2px signal-amber bar on the
 * left edge and switches text to paper-100. Hover lifts the row to ink-700.
 */
export function NavItem({ href, label, icon: Icon, collapsed = false, badge }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-sm pl-4 pr-2 py-2 text-body-sm font-medium font-sans',
        'transition-colors duration-150 ease-mission',
        isActive
          ? 'text-paper-100 bg-ink-700'
          : 'text-paper-300 hover:bg-ink-700 hover:text-paper-100',
        collapsed && 'justify-center px-2 pl-2',
      )}
      title={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && !collapsed && (
        <span aria-hidden="true" className="absolute left-0 top-1 bottom-1 w-[2px] bg-signal" />
      )}
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          isActive ? 'text-signal' : 'text-paper-500 group-hover:text-paper-300',
        )}
        aria-hidden="true"
      />
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between gap-2 truncate">
          <span className="truncate">{label}</span>
          {badge && (
            <span className="ml-auto shrink-0 rounded-data border border-danger px-1.5 py-[1px] font-mono text-mono-sm uppercase tracking-[0.05em] leading-none text-danger">
              {badge}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
