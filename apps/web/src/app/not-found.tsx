import Link from 'next/link';
import { Button } from '@levelup/ui';
import { MarketingNav } from '@/components/navigation/marketing-nav';

export default function NotFound() {
  return (
    <>
      <MarketingNav />
      <main className="flex flex-1 min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Decorative SVG */}
          <div aria-hidden="true" className="text-muted-foreground/20">
            <svg
              width="180"
              height="120"
              viewBox="0 0 180 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto"
            >
              {/* Grid lines */}
              <line
                x1="0"
                y1="30"
                x2="180"
                y2="30"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="0"
                y1="60"
                x2="180"
                y2="60"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="0"
                y1="90"
                x2="180"
                y2="90"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="30"
                y1="0"
                x2="30"
                y2="120"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="90"
                y1="0"
                x2="90"
                y2="120"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="150"
                y1="0"
                x2="150"
                y2="120"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              {/* Big question mark */}
              <text
                x="90"
                y="78"
                textAnchor="middle"
                fontSize="72"
                fontWeight="700"
                fill="currentColor"
                className="select-none"
              >
                ?
              </text>
            </svg>
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <p className="text-8xl font-black tracking-tighter text-foreground leading-none">404</p>
            <h1 className="text-2xl font-semibold text-foreground">
              We can&apos;t find that page.
            </h1>
            <p className="max-w-sm text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get
              you back on track.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
