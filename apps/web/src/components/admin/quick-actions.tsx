import Link from 'next/link';
import { UserPlus, GraduationCap, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@levelup/ui';

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Invite teammate — links to people page with invite dialog open */}
          <Link
            href="/admin/people?invite=open"
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Invite a teammate</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Send an email invite to join your org
              </p>
            </div>
          </Link>

          {/* Assign learning path */}
          <Link
            href="/admin/learning"
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Assign a learning path</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Assign AI courses to your team</p>
            </div>
          </Link>

          {/* Upload AI policy */}
          <Link
            href="/admin/policy"
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Upload AI policy</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Share your company&apos;s AI usage policy
              </p>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickActionsButton() {
  return (
    <Button asChild>
      <Link href="/admin/people?invite=open">
        <UserPlus className="mr-2 h-4 w-4" />
        Invite teammate
      </Link>
    </Button>
  );
}
