'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
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
  Sun,
  Moon,
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
  Separator,
} from '@levelup/ui';
import { Logo } from '@/components/brand/logo';
import { NavItem } from './nav-item';
import { FlagsProvider } from '@/lib/flags/flags-context';
import { PostHogProvider } from '@/lib/analytics/posthog-provider';

/** Minimal user shape passed from the server layout — avoids importing server-only auth-client */
export interface ShellUser {
  email: string;
  name?: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  /** Optional: provided for analytics identification. */
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

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/people', label: 'People', icon: Users },
  { href: '/admin/learning', label: 'Learning', icon: BookOpen },
  { href: '/admin/reports', label: 'Reports', icon: BarChart2 },
  { href: '/admin/insights', label: 'Insights', icon: BarChart3 },
  { href: '/admin/policy', label: 'Policy', icon: FileText },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/flags', label: 'Flags', icon: Flag },
  { href: '/admin/integrations', label: 'Integrations', icon: Plug },
  { href: '/admin/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { href: '/admin/dlq', label: 'DLQ', icon: Activity },
  { href: '/admin/audit', label: 'Audit log', icon: FileSearch },
] as const;

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

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
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
      className={`flex h-full flex-col border-r border-border bg-card transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Logo area */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-border px-3 ${
          collapsed ? 'justify-center' : 'gap-2'
        }`}
      >
        <Link href="/admin" aria-label="LevelUp AI Academy">
          {collapsed ? (
            <svg
              width={28}
              height={28}
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="36" height="36" rx="9" fill="hsl(239 84% 45%)" />
              <text
                x="5"
                y="26"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontSize="17"
                fontWeight="700"
                fill="white"
                letterSpacing="-0.5"
              >
                LU
              </text>
            </svg>
          ) : (
            <Logo size="sm" />
          )}
        </Link>
      </div>

      {/* Org name */}
      {!collapsed && (
        <div className="px-3 py-2">
          <p className="truncate text-xs font-medium text-muted-foreground">{orgName}</p>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const badge =
            item.href === '/admin/anomalies' && (unackAnomalyCount ?? 0) > 0
              ? String(unackAnomalyCount)
              : undefined;
          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              badge={badge}
            />
          );
        })}
      </nav>
    </div>
  );
}

export function AdminShell({ user, orgName, children, unackAnomalyCount }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = React.useState(false);

  const initials = getInitials(user.name, user.email);

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
        <div className="flex h-screen overflow-hidden bg-background">
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
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
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

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top bar */}
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
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

              <div className="flex-1" />

              {/* Right side controls */}
              <div className="flex items-center gap-2">
                <ThemeToggle />

                <Separator orientation="vertical" className="h-6" />

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex h-8 items-center gap-2 px-2 text-sm">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden max-w-[120px] truncate sm:inline">
                        {user.name ?? user.email}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{user.name ?? 'Admin'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/sign-out"
                        className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </FlagsProvider>
    </PostHogProvider>
  );
}
