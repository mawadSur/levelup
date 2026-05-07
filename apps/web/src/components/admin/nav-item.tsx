'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed?: boolean;
  /** Optional badge text — shown as a small oxblood pill next to the label. */
  badge?: string;
}

/**
 * Admin sidebar navigation item.
 *
 * When active, renders an animated oxblood underline using a shared
 * `layoutId` so Motion smoothly transitions the indicator between routes.
 */
export function NavItem({ href, label, icon: Icon, collapsed = false, badge }: NavItemProps) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed && 'justify-center px-2',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          isActive
            ? 'text-primary-foreground'
            : 'text-muted-foreground group-hover:text-accent-foreground',
        )}
        aria-hidden="true"
      />
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between gap-1 truncate">
          <span className="truncate">{label}</span>
          {badge && (
            <span className="ml-auto shrink-0 rounded-full bg-[#8B1A1A] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {badge}
            </span>
          )}
        </span>
      )}

      {/* Active underline indicator — shared layoutId animates between nav items */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="active-nav-underline"
            className="absolute inset-x-3 bottom-0.5 h-[1.5px] rounded-full bg-primary-foreground/60"
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.18 }}
          />
        )}
      </AnimatePresence>
    </Link>
  );
}
