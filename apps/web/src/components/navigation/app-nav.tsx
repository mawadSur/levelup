import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export function AppNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/learn" aria-label="LevelUp AI Academy">
          <Logo size="sm" />
        </Link>
        <nav className="flex items-center gap-4">{/* User menu — placeholder for T3.3 */}</nav>
      </div>
    </header>
  );
}
