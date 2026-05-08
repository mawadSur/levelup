import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, TrendingUp, Mail, AlertTriangle, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@levelup/ui';
import { getSessionUser, isDemoOrg } from '@/lib/auth-client';
import { organizations, reports, invitations } from '@/lib/api';
import { StatCard } from '@/components/admin/stat-card';
import { DeptBarList } from '@/components/admin/dept-bar-list';
import { QuickActions } from '@/components/admin/quick-actions';
import { DemoControlsCard } from '@/components/admin/demo/demo-controls-card';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function AdminDashboardPage() {
  const user = await getSessionUser();

  // Fetch all data in parallel — each call fails gracefully
  const [statsResult, reportResult, invitesResult, orgResult] = await Promise.allSettled([
    organizations.getStats(),
    reports.getCompletionReport(),
    invitations.listInvites(),
    organizations.getMyOrg(),
  ]);

  const stats = statsResult.status === 'fulfilled' ? statsResult.value : null;
  const report = reportResult.status === 'fulfilled' ? reportResult.value : null;
  const inviteList = invitesResult.status === 'fulfilled' ? invitesResult.value : [];
  const org = orgResult.status === 'fulfilled' ? orgResult.value : null;

  const pendingInvites = inviteList.filter((i) => i.status === 'PENDING');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const firstName = user?.name?.split(' ').at(0) ?? 'there';

  // Build department bar items from report
  const deptItems = (report?.byDepartment ?? []).map((d) => ({
    name: d.name,
    value: Math.round(d.completionRate * 100),
    max: 100,
    sublabel: `${d.memberCount} members`,
  }));

  // OrgStats doesn't expose a byRole breakdown — we show activity stats instead.
  // A real byRole feed would require a separate endpoint.
  const activityItems =
    stats && stats.totalUsers > 0
      ? [
          {
            name: 'Active members (last 30 d)',
            value: stats.activeUsers,
            max: stats.totalUsers,
            sublabel: `${stats.activeUsers} / ${stats.totalUsers}`,
          },
          {
            name: 'Completion rate',
            value: Math.floor(stats.completionRate * 100),
            max: 100,
          },
        ]
      : [];

  // Demo controls: shown only when NEXT_PUBLIC_DEMO_CONTROLS=on AND the org is
  // a demo org (name contains "[Demo]"/"Demo" or org ID is in DEMO_ORG_ALLOWLIST).
  const demoControlsEnabled = process.env.NEXT_PUBLIC_DEMO_CONTROLS === 'on';
  const showDemoControls = demoControlsEnabled && org !== null && isDemoOrg(org.name, org.id);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* 1. Header row */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-paper-100">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-base text-paper-300">Here&apos;s how your team&apos;s doing.</p>
        <p className="mt-0.5 text-sm text-paper-300/70">{today}</p>
      </div>

      {/* 2. Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total team"
          value={stats?.totalUsers ?? '—'}
          sublabel={stats ? `${stats.activeUsers} active in last 30 days` : 'Loading…'}
          icon={Users}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        />

        <StatCard
          title="Completion rate"
          value={stats ? `${Math.floor(stats.completionRate * 100)}%` : '—'}
          sublabel="Across assigned paths"
          icon={TrendingUp}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
        />

        <StatCard
          title="Pending invites"
          value={pendingInvites.length}
          sublabel={pendingInvites.length > 0 ? 'Re-send or revoke from People' : 'All caught up'}
          icon={Mail}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          cta={
            pendingInvites.length > 0 ? (
              <Link
                href="/admin/people"
                className="text-xs font-medium text-signal underline-offset-4 hover:underline"
              >
                View in People →
              </Link>
            ) : undefined
          }
        />

        <StatCard
          title="Risk flags"
          value={stats?.riskFlags ?? '?'}
          sublabel="Learners needing attention"
          icon={AlertTriangle}
          iconClassName="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
          cta={
            <Link
              href="/admin/reports"
              className="text-xs font-medium text-signal underline-offset-4 hover:underline"
            >
              View reports →
            </Link>
          }
        />
      </div>

      {/* 3. Two-column breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By department */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Completion by department</CardTitle>
          </CardHeader>
          <CardContent>
            {deptItems.length > 0 ? (
              <DeptBarList items={deptItems} />
            ) : (
              <p className="py-6 text-center text-sm text-paper-300">
                {report === null ? 'Unable to load department data.' : 'No departments set up yet.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* By role / activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Team activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityItems.length > 0 ? (
              <DeptBarList items={activityItems} />
            ) : (
              <p className="py-6 text-center text-sm text-paper-300">
                {stats === null ? 'Unable to load stats.' : 'No activity data yet.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Quick actions */}
      <QuickActions />

      {/* 5. Recent activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-700">
              <TrendingUp className="h-5 w-5 text-paper-300" />
            </div>
            <p className="text-sm font-medium text-paper-100">Coming soon</p>
            <p className="text-sm text-paper-300">
              Live feed of invitation accepts, lesson completions, and certificates will appear
              here.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 6. Demo controls — only visible on demo orgs when flag is on */}
      {showDemoControls && (
        <Card className="border-amber-300/60 bg-amber-50/40 dark:border-amber-700/40 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-amber-700 dark:text-amber-400">
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Demo controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-paper-300">
              Wipe and reseed this org with a believable demo snapshot shaped around a
              prospect&apos;s company name.
            </p>
            <DemoControlsCard />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
