import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, TrendingUp, Mail, AlertTriangle, FlaskConical } from 'lucide-react';
import { Card, CardContent, MonoLabel, NumberedSection } from '@levelup/ui';
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

  const today = new Date()
    .toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();

  const firstName = user?.name?.split(' ').at(0) ?? 'operator';

  const deptItems = (report?.byDepartment ?? []).map((d) => ({
    name: d.name,
    value: Math.round(d.completionRate * 100),
    max: 100,
    sublabel: `${d.memberCount} members`,
  }));

  const activityItems =
    stats && stats.totalUsers > 0
      ? [
          {
            name: 'Active members (30 d)',
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

  const demoControlsEnabled = process.env.NEXT_PUBLIC_DEMO_CONTROLS === 'on';
  const showDemoControls = demoControlsEnabled && org !== null && isDemoOrg(org.name, org.id);

  const totalUsers = stats?.totalUsers ?? 0;
  const noTeam = stats !== null && totalUsers === 0;

  return (
    <div className="mx-auto max-w-content space-y-12 px-6 py-10">
      <header className="animate-mission-in space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <MonoLabel>BRIEFING</MonoLabel>
          <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            {today}
          </span>
        </div>
        <h1 className="font-serif text-display-md italic text-paper-100">
          Welcome back, {firstName}.
        </h1>
        <p className="max-w-reading text-body-lg text-paper-300">
          A snapshot of your team&apos;s training posture. Tap into any tile for the underlying
          report.
        </p>
      </header>

      {noTeam ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Users className="h-8 w-8 text-paper-500" aria-hidden="true" />
            <MonoLabel>NO DATA YET — ENROLL EMPLOYEES TO BEGIN</MonoLabel>
            <p className="max-w-md text-body-sm text-paper-300">
              Enroll Kapitus employees into the academy. Each enrollment triggers an audited
              onboarding sequence and starts populating this dashboard.
            </p>
            <Link
              href="/admin/people?invite=open"
              className="inline-flex h-10 items-center gap-2 rounded-sm bg-signal px-4 font-sans text-body-sm font-medium text-ink-900 transition-colors hover:bg-paper-100"
            >
              Enroll employees
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <NumberedSection numeral="01" eyebrow="POSTURE" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Active users"
                value={stats?.totalUsers ?? '—'}
                sublabel={stats ? `${stats.activeUsers} active in last 30 d` : 'Stats unavailable'}
                icon={Users}
              />
              <StatCard
                title="Completion"
                value={stats ? stats.completionRate : '—'}
                format="percent"
                sublabel="Across assigned paths"
                icon={TrendingUp}
              />
              <StatCard
                title="Pending enrollments"
                value={pendingInvites.length}
                sublabel={
                  pendingInvites.length > 0 ? 'Re-send or revoke from People' : 'All caught up'
                }
                icon={Mail}
                cta={
                  pendingInvites.length > 0 ? (
                    <Link
                      href="/admin/people"
                      className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal hover:text-paper-100"
                    >
                      VIEW IN PEOPLE →
                    </Link>
                  ) : undefined
                }
              />
              <StatCard
                title="Risk flags"
                value={stats?.riskFlags ?? '—'}
                sublabel="Learners needing attention"
                icon={AlertTriangle}
                cta={
                  <Link
                    href="/admin/reports"
                    className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal hover:text-paper-100"
                  >
                    VIEW REPORTS →
                  </Link>
                }
              />
            </div>
          </NumberedSection>

          <NumberedSection numeral="02" eyebrow="BREAKDOWN" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <MonoLabel>BY DEPARTMENT</MonoLabel>
                    <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                      COMPLETION %
                    </span>
                  </div>
                  {deptItems.length > 0 ? (
                    <DeptBarList items={deptItems} />
                  ) : (
                    <p className="py-6 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                      {report === null ? 'DEPARTMENT DATA UNAVAILABLE' : 'NO DEPARTMENTS YET'}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <MonoLabel>TEAM ACTIVITY</MonoLabel>
                    <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                      LAST 30 DAYS
                    </span>
                  </div>
                  {activityItems.length > 0 ? (
                    <DeptBarList items={activityItems} />
                  ) : (
                    <p className="py-6 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                      {stats === null ? 'STATS UNAVAILABLE' : 'NO ACTIVITY YET'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </NumberedSection>

          <NumberedSection numeral="03" eyebrow="QUICK ACTIONS" className="space-y-6">
            <QuickActions />
          </NumberedSection>

          <NumberedSection numeral="04" eyebrow="ACTIVITY STREAM" className="space-y-6">
            <Card>
              <CardContent className="space-y-3 p-6">
                <MonoLabel>RECENT EVENTS</MonoLabel>
                <p className="text-body-sm text-paper-300">
                  Live feed of invitation accepts, lesson completions, and certificate issuances
                  will appear here.
                </p>
                <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  STATUS · COMING ONLINE
                </p>
              </CardContent>
            </Card>
          </NumberedSection>
        </>
      )}

      {showDemoControls && (
        <NumberedSection numeral="99" eyebrow="DEMO CONTROLS">
          <Card className="border-signal-dim">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-signal" aria-hidden="true" />
                <MonoLabel tone="signal">SANDBOX MODE</MonoLabel>
              </div>
              <p className="text-body-sm text-paper-300">
                Wipe and reseed this org with a believable demo snapshot shaped around a
                prospect&apos;s company name.
              </p>
              <DemoControlsCard />
            </CardContent>
          </Card>
        </NumberedSection>
      )}
    </div>
  );
}
