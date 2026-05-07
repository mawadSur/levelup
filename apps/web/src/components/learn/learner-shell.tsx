'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '@/components/brand/logo';
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@levelup/ui';
import { cn } from '@levelup/ui';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { XpProvider } from './hud/xp-context';
import { XpHud } from './hud/xp-hud';
import { LevelUpModal } from './hud/level-up-modal';
import { BadgeEarnRibbon } from './hud/badge-earn-ribbon';
import { OnboardingProvider } from './onboarding/onboarding-context';
import { OnboardingTour } from './onboarding/onboarding-tour';
import { GlobalSearchDialog } from './search/global-search-dialog';
import { FlagsProvider } from '@/lib/flags/flags-context';
import { PostHogProvider, usePostHog } from '@/lib/analytics/posthog-provider';

/**
 * Fires `learn_app_opened` once on mount — placed inside PostHogProvider so the
 * client has already been initialised when this hook runs.
 */
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
  /** Provided for analytics identification. Optional so existing callers without it remain compatible. */
  userId?: string;
  organizationId?: string;
}

interface LearnerShellProps {
  children: React.ReactNode;
  user: NavUser;
}

type NavLink = { href: string; label: string };

const BASE_NAV_LINKS: NavLink[] = [
  { href: '/learn', label: 'Learn' },
  { href: '/playbooks', label: 'Playbooks' },
  { href: '/coach', label: 'Coach' },
  { href: '/prompts', label: 'Prompts' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
];

const MANAGER_NAV_LINKS: NavLink[] = [...BASE_NAV_LINKS, { href: '/team', label: 'Team' }];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Mobile drawer animation
const drawerVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
};

export function LearnerShell({ children, user }: LearnerShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const isManager = user.role === 'MANAGER' || user.role === 'ADMIN';

  // Build the analytics identity only when both ids are available.
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

  // Cmd+K (or Ctrl+K) opens the global search dialog — keyboard-only entry point.
  // TODO: mobile users without a hardware keyboard have no shortcut entry for now.
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
  const navLinks = isManager ? MANAGER_NAV_LINKS : BASE_NAV_LINKS;

  return (
    <PostHogProvider user={analyticsUser}>
      <LearnAppOpenedTracker />
      <FlagsProvider>
        <XpProvider>
          <OnboardingProvider>
            <div className="flex min-h-screen flex-col">
              {/* Top bar */}
              <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                  {/* Logo */}
                  <Link href="/learn" aria-label="LevelUp AI Academy home">
                    <Logo size="sm" />
                  </Link>

                  {/* Desktop nav */}
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
                          className={cn(
                            'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          )}
                        >
                          {link.label}
                          {/* Active underline with shared layoutId for smooth transition */}
                          <AnimatePresence>
                            {isActive && (
                              <motion.div
                                layoutId="learner-active-nav-underline"
                                className="absolute inset-x-2 bottom-0.5 h-[1.5px] rounded-full bg-primary"
                                initial={prefersReduced ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: prefersReduced ? 0 : 0.18 }}
                              />
                            )}
                          </AnimatePresence>
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Right side: XP HUD + avatar + hamburger */}
                  <div className="flex items-center gap-3">
                    {/* XP HUD — between nav and avatar */}
                    <XpHud />
                    {/* Avatar dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="User menu"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                              {getInitials(user.name || user.email)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="px-3 py-2">
                          <p className="text-sm font-medium leading-none">{user.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/sign-out">Sign out</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Hamburger (mobile) */}
                    <button
                      className="flex h-9 w-9 items-center justify-center rounded-md md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                      aria-expanded={mobileMenuOpen}
                      onClick={() => setMobileMenuOpen((v) => !v)}
                    >
                      <span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
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
                            strokeWidth="2"
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
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Mobile nav drawer — animated open/close */}
                <AnimatePresence>
                  {mobileMenuOpen && (
                    <motion.nav
                      key="mobile-nav"
                      variants={prefersReduced ? undefined : drawerVariants}
                      initial={prefersReduced ? undefined : 'hidden'}
                      animate={prefersReduced ? undefined : 'visible'}
                      exit={prefersReduced ? undefined : 'exit'}
                      className="border-t border-border/40 bg-background px-4 pb-4 pt-2 md:hidden"
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
                              'block rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            )}
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </motion.nav>
                  )}
                </AnimatePresence>
              </header>

              {/* Page content */}
              <main className="flex-1">{children}</main>

              {/* Global gamification overlays */}
              <LevelUpModal />
              <BadgeEarnRibbon />
              {/* Onboarding tour — rendered once at shell root */}
              <OnboardingTour />
              {/* Global search dialog — opened via Cmd+K / Ctrl+K */}
              <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
            </div>
          </OnboardingProvider>
        </XpProvider>
      </FlagsProvider>
    </PostHogProvider>
  );
}
