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
            className="group flex flex-col items-center gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 text-center transition-all hover:border-signal/50 hover:bg-signal/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal/10 text-signal transition-colors group-hover:bg-signal group-hover:text-ink-900">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-paper-100">Invite a teammate</p>
              <p className="mt-0.5 text-xs text-paper-300">Send an email invite to join your org</p>
            </div>
          </Link>

          {/* Assign learning path */}
          <Link
            href="/admin/learning"
            className="group flex flex-col items-center gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 text-center transition-all hover:border-signal/50 hover:bg-signal/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal/10 text-signal transition-colors group-hover:bg-signal group-hover:text-ink-900">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-paper-100">Assign a learning path</p>
              <p className="mt-0.5 text-xs text-paper-300">Assign AI courses to your team</p>
            </div>
          </Link>

          {/* Upload AI policy */}
          <Link
            href="/admin/policy"
            className="group flex flex-col items-center gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 text-center transition-all hover:border-signal/50 hover:bg-signal/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal/10 text-signal transition-colors group-hover:bg-signal group-hover:text-ink-900">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-paper-100">Upload AI policy</p>
              <p className="mt-0.5 text-xs text-paper-300">
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
