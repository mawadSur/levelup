'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  MonoLabel,
} from '@levelup/ui';
import { cn } from '@levelup/ui';
import { XpProvider } from './hud/xp-context';
import { XpHud } from './hud/xp-hud';
import { LevelUpModal } from './hud/level-up-modal';
import { BadgeEarnRibbon } from './hud/badge-earn-ribbon';
import { OnboardingProvider } from './onboarding/onboarding-context';
import { OnboardingTour } from './onboarding/onboarding-tour';
import { GlobalSearchDialog } from './search/global-search-dialog';
import { FlagsProvider } from '@/lib/flags/flags-context';
import { PostHogProvider, usePostHog } from '@/lib/analytics/posthog-provider';
import { brand, IS_KAPITUS, IS_CEOLAWYER } from '@/lib/client';
import { LocaleSwitcher } from './locale-switcher';
import type { Locale } from '@/lib/i18n';

const SEAL = IS_KAPITUS ? 'K' : IS_CEOLAWYER ? 'CL' : 'LU';
const WORDMARK = IS_KAPITUS || IS_CEOLAWYER ? brand.shortName : 'LevelUp';

/** Fires `learn_app_opened` once on mount. */
function LearnAppOpenedTracker() {
  const phog = usePostHog();
  useEffect(() => {
    phog?.capture('learn_app_opened');
  }, [phog]);
  return null;
}

interface NavUser {
  name: string;
  email: string;
  role: string;
  userId?: string;
  organizationId?: string;
}

interface NavLabels {
  /** Localised "Sign out" label. Falls back to English when omitted. */
  signOut?: string;
  /** Localised "Sign up" label. Currently unused in the shell — wired
   * through so other learn-app shells (sign-in CTA on public marketing
   * pages, etc.) can pick the same source. */
  signUp?: string;
  /** Localised "Team" — manager-only nav entry. */
  team?: string;
  /** Localised "Policy" — reserved for the future policy nav entry. */
  policy?: string;
  /** Localised "Reports" — reserved for the future reports nav entry. */
  reports?: string;
  /** Localised "Admin console" dropdown item. */
  adminConsole?: string;
  /** Localised "Language" label — kept here for parity with the message
   * bundle. The actual `<LANGUAGE>` legend lives inside `LocaleSwitcher`
   * which is frozen for this wave. */
  language?: string;
}

interface LocaleProps {
  /** Currently-active locale resolved server-side via `getLocale()`. */
  current: Locale;
  /** Supported locales — passed from server to keep `i18n.ts` server-only. */
  supported: readonly Locale[];
}

interface LearnerShellProps {
  children: React.ReactNode;
  user: NavUser;
  /** Server-resolved i18n labels (CR.38). Optional — defaults to English. */
  navLabels?: NavLabels;
  /** Locale data for the in-menu language switcher. Optional. */
  locale?: LocaleProps;
}

type NavLink = { href: string; label: string };

const BASE_NAV_LINKS: NavLink[] = [
  { href: '/learn', label: 'Learn' },
  { href: '/curriculum', label: 'Curriculum' },
  { href: '/playbooks', label: 'Playbooks' },
  { href: '/coach', label: 'Coach' },
  { href: '/prompts', label: 'Prompts' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
];

/**
 * Manager-only nav links. The `/team` label is sourced from `navLabels.team`
 * at render time (Wave 5 i18n wiring) and falls back to English when no
 * translator is passed.
 */
function buildManagerNavLinks(teamLabel: string): NavLink[] {
  return [...BASE_NAV_LINKS, { href: '/team', label: teamLabel }];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function LearnerShell({ children, user, navLabels, locale }: LearnerShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname() ?? '';
  const isManager = user.role === 'MANAGER' || user.role === 'ADMIN';
  const signOutLabel = navLabels?.signOut ?? 'Sign out';
  const teamLabel = navLabels?.team ?? 'Team';
  const adminConsoleLabel = navLabels?.adminConsole ?? 'Admin console';

  const analyticsUser =
    user.userId && user.organizationId
      ? {
          userId: user.userId,
          organizationId: user.organizationId,
          email: user.email,
          role: user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
          name: user.name,
        }
      : null;

  // Cmd+K opens global search.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = isManager ? buildManagerNavLinks(teamLabel) : BASE_NAV_LINKS;

  return (
    <PostHogProvider user={analyticsUser}>
      <LearnAppOpenedTracker />
      <FlagsProvider>
        <XpProvider>
          <OnboardingProvider>
            <div className="flex min-h-screen flex-col bg-ink-900 text-paper-100">
              {/* Top bar — 56px, mono nav, signal underline on active */}
              <header className="sticky top-0 z-50 border-b border-ink-600 bg-ink-900/95 backdrop-blur supports-[backdrop-filter]:bg-ink-900/85">
                <div className="mx-auto flex h-14 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
                  <Link
                    href="/learn"
                    aria-label={`${brand.name} home`}
                    className="flex items-center gap-2"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 items-center justify-center rounded-sm bg-signal font-mono text-mono-sm font-semibold text-ink-900"
                    >
                      {SEAL}
                    </span>
                    <span
                      className={
                        IS_KAPITUS || IS_CEOLAWYER
                          ? 'hidden text-h3 font-semibold text-paper-100 sm:inline'
                          : 'hidden font-serif text-h3 italic text-paper-100 sm:inline'
                      }
                    >
                      {WORDMARK}
                    </span>
                  </Link>

                  <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
                    {navLinks.map((link) => {
                      const isActive =
                        link.href === '/learn'
                          ? pathname === '/learn' || pathname.startsWith('/learn/')
                          : pathname.startsWith(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          {...(link.href === '/coach' ? { 'data-onboarding': 'nav-coach' } : {})}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'relative px-3 py-2 font-mono text-mono-sm uppercase tracking-[0.05em] transition-colors',
                            isActive ? 'text-paper-100' : 'text-paper-500 hover:text-paper-100',
                          )}
                        >
                          {link.label}
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-x-2 -bottom-[2px] h-[2px] bg-signal"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="flex items-center gap-3">
                    <XpHud />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="flex h-9 w-9 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                          aria-label="User menu"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-ink-700 font-mono text-mono-sm font-semibold text-paper-100">
                              {getInitials(user.name || user.email)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56"
                        // Prevent Radix from yanking focus back into the
                        // trigger after the native <select> popup closes —
                        // that focus-flip is what causes the parent menu to
                        // dismiss on macOS/iOS when the LocaleSwitcher is
                        // used. See locale-switcher.tsx for the matching
                        // pointer-event guard.
                        onCloseAutoFocus={(e) => {
                          if (locale) e.preventDefault();
                        }}
                      >
                        <div className="px-3 py-2">
                          <MonoLabel>SIGNED IN AS</MonoLabel>
                          <p className="mt-1 truncate text-body-sm font-medium text-paper-100">
                            {user.name}
                          </p>
                          <p className="truncate font-mono text-mono-sm text-paper-300">
                            {user.email}
                          </p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/profile">Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/settings">Settings</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/privacy">Privacy</Link>
                        </DropdownMenuItem>
                        {isManager && (
                          <DropdownMenuItem asChild>
                            <Link href="/admin">{adminConsoleLabel}</Link>
                          </DropdownMenuItem>
                        )}
                        {locale && (
                          <>
                            <DropdownMenuSeparator />
                            <LocaleSwitcher supported={locale.supported} current={locale.current} />
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/sign-out" className="text-danger focus:text-danger">
                            {signOutLabel}
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                      className="flex h-9 w-9 items-center justify-center rounded-sm text-paper-300 hover:bg-ink-700 hover:text-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal md:hidden"
                      aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                      aria-expanded={mobileMenuOpen}
                      onClick={() => setMobileMenuOpen((v) => !v)}
                    >
                      {mobileMenuOpen ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 4L16 16M16 4L4 16"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 6h14M3 10h14M3 14h14"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {mobileMenuOpen && (
                  <nav
                    className="border-t border-ink-600 bg-ink-900 px-4 pb-4 pt-2 md:hidden"
                    aria-label="Mobile navigation"
                  >
                    {navLinks.map((link) => {
                      const isActive =
                        link.href === '/learn'
                          ? pathname === '/learn' || pathname.startsWith('/learn/')
                          : pathname.startsWith(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'block rounded-sm px-3 py-2.5 font-mono text-mono-sm uppercase tracking-[0.05em] transition-colors',
                            isActive
                              ? 'bg-ink-700 text-paper-100'
                              : 'text-paper-300 hover:bg-ink-700 hover:text-paper-100',
                          )}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </nav>
                )}
              </header>

              <main className="flex-1">{children}</main>

              <LevelUpModal />
              <BadgeEarnRibbon />
              <OnboardingTour />
              <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
            </div>
          </OnboardingProvider>
        </XpProvider>
      </FlagsProvider>
    </PostHogProvider>
  );
}
