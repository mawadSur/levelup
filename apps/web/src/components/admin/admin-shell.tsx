'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart2,
  BarChart3,
  FileText,
  CreditCard,
  Flag,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Activity,
  FileSearch,
  AlertTriangle,
  Plug,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  MonoLabel,
} from '@levelup/ui';
import { NavItem } from './nav-item';
import { FlagsProvider } from '@/lib/flags/flags-context';
import { PostHogProvider } from '@/lib/analytics/posthog-provider';

/** Minimal user shape passed from the server layout — avoids importing server-only auth-client. */
export interface ShellUser {
  email: string;
  name?: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  userId?: string;
  organizationId?: string;
}

interface AdminShellProps {
  user: ShellUser;
  orgName: string;
  children: React.ReactNode;
  /** Server-rendered count of unacknowledged anomaly alerts for the nav badge. */
  unackAnomalyCount?: number;
}

type NavGroup = {
  label: string;
  items: ReadonlyArray<{
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
  }>;
};

const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    label: 'General',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/people', label: 'People', icon: Users },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/admin/learning', label: 'Learning paths', icon: BookOpen },
      { href: '/admin/reports', label: 'Reports', icon: BarChart2 },
      { href: '/admin/insights', label: 'Insights', icon: BarChart3 },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/admin/policy', label: 'Policy', icon: FileText },
      { href: '/admin/flags', label: 'Flags', icon: Flag },
      { href: '/admin/anomalies', label: 'Anomalies', icon: AlertTriangle },
      { href: '/admin/audit', label: 'Audit log', icon: FileSearch },
    ],
  },
  {
    label: 'Ops',
    items: [
      { href: '/admin/integrations', label: 'Integrations', icon: Plug },
      { href: '/admin/dlq', label: 'DLQ', icon: Activity },
      { href: '/admin/billing', label: 'Billing', icon: CreditCard },
    ],
  },
];

function getInitials(name: string | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    if (parts.length >= 2 && first && last) {
      return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
    }
    return first.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function buildBreadcrumb(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0 || segments[0] !== 'admin') return 'ADMIN';
  if (segments.length === 1) return 'ADMIN / DASHBOARD';
  return `ADMIN / ${segments
    .slice(1)
    .map((s) => s.replace(/-/g, ' ').toUpperCase())
    .join(' / ')}`;
}

function Sidebar({
  orgName,
  collapsed,
  unackAnomalyCount,
}: {
  orgName: string;
  collapsed: boolean;
  unackAnomalyCount?: number;
}) {
  return (
    <div
      className={`flex h-full flex-col border-r border-ink-600 bg-ink-800 transition-[width] duration-200 ease-mission ${
        collapsed ? 'w-14' : 'w-60'
      }`}
    >
      {/* Wordmark */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-ink-600 px-4 ${
          collapsed ? 'justify-center px-2' : ''
        }`}
      >
        <Link
          href="/admin"
          aria-label="LevelUp AI Academy — admin home"
          className="flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-sm bg-signal font-mono text-mono-sm font-semibold text-ink-900"
          >
            LU
          </span>
          {!collapsed && <span className="font-serif text-h3 italic text-paper-100">LevelUp</span>}
        </Link>
      </div>

      {/* Org name in mono */}
      {!collapsed && (
        <div className="border-b border-ink-600 px-4 py-3">
          <MonoLabel className="block truncate text-paper-500">ORG</MonoLabel>
          <p className="mt-0.5 truncate text-body-sm text-paper-100">{orgName}</p>
        </div>
      )}

      {/* Grouped nav */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Admin navigation">
        {NAV_GROUPS.map((group, idx) => (
          <div key={group.label} className={idx > 0 ? 'mt-5' : undefined}>
            {!collapsed && (
              <div className="mb-1.5 px-4">
                <MonoLabel className="block text-paper-500">{group.label.toUpperCase()}</MonoLabel>
              </div>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const badge =
                  item.href === '/admin/anomalies' && (unackAnomalyCount ?? 0) > 0
                    ? String(unackAnomalyCount)
                    : undefined;
                return (
                  <li key={item.href}>
                    <NavItem
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      collapsed={collapsed}
                      badge={badge}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer status row */}
      {!collapsed && (
        <div className="border-t border-ink-600 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
            <MonoLabel className="text-paper-500">SYSTEM NOMINAL</MonoLabel>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminShell({ user, orgName, children, unackAnomalyCount }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = React.useState(false);
  const pathname = usePathname() ?? '/admin';

  const initials = getInitials(user.name, user.email);
  const breadcrumb = buildBreadcrumb(pathname);

  const analyticsUser =
    user.userId && user.organizationId
      ? {
          userId: user.userId,
          organizationId: user.organizationId,
          email: user.email,
          role: user.role,
          name: user.name,
        }
      : null;

  return (
    <PostHogProvider user={analyticsUser}>
      <FlagsProvider>
        <div className="flex h-screen overflow-hidden bg-ink-900 text-paper-100">
          {/* Desktop sidebar */}
          <div className="hidden md:flex md:shrink-0">
            <Sidebar
              orgName={orgName}
              collapsed={desktopCollapsed}
              unackAnomalyCount={unackAnomalyCount}
            />
          </div>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <button
                type="button"
                aria-label="Close sidebar"
                className="absolute inset-0 bg-ink-900/80 backdrop-blur-[2px]"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="relative flex h-full w-64 flex-col">
                <Sidebar
                  orgName={orgName}
                  collapsed={false}
                  unackAnomalyCount={unackAnomalyCount}
                />
              </div>
            </div>
          )}

          {/* Main column */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top bar — 56px */}
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-600 bg-ink-900 px-4">
              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Desktop collapse toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-8 w-8 md:flex"
                onClick={() => setDesktopCollapsed((c) => !c)}
                aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {desktopCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>

              {/* Breadcrumb in mono */}
              <MonoLabel className="hidden truncate text-paper-300 sm:block">
                {breadcrumb}
              </MonoLabel>

              <div className="flex-1" />

              {/* Right controls */}
              <div className="flex items-center gap-2">
                <MonoLabel className="hidden text-paper-500 lg:block">
                  {new Date()
                    .toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    .toUpperCase()}
                </MonoLabel>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex h-9 items-center gap-2 px-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-signal font-mono text-mono-sm font-semibold text-ink-900">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden max-w-[140px] truncate text-body-sm text-paper-100 sm:inline">
                        {user.name ?? user.email}
                      </span>
                      <ChevronDown className="h-3 w-3 text-paper-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-2">
                      <MonoLabel className="block text-paper-500">SIGNED IN AS</MonoLabel>
                      <p className="mt-1 truncate text-body-sm font-medium text-paper-100">
                        {user.name ?? 'Admin'}
                      </p>
                      <p className="truncate font-mono text-mono-sm text-paper-300">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex cursor-pointer items-center gap-2">
                        <User className="h-4 w-4 text-paper-300" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/learn" className="flex cursor-pointer items-center gap-2">
                        <BookOpen className="h-4 w-4 text-paper-300" />
                        <span>Learner view</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/sign-out"
                        className="flex cursor-pointer items-center gap-2 text-danger focus:text-danger"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto bg-ink-900">{children}</main>
          </div>
        </div>
      </FlagsProvider>
    </PostHogProvider>
  );
}
