import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, FlaskConical } from 'lucide-react';
import { Card, CardContent, MissionNumber, MonoLabel, NumberedSection } from '@levelup/ui';
import { getSessionUser, isDemoOrg } from '@/lib/auth-client';
import { organizations, reports, invitations } from '@/lib/api';
import { StatCard } from '@/components/admin/stat-card';
import { DeptBarList } from '@/components/admin/dept-bar-list';
import { QuickActions } from '@/components/admin/quick-actions';
import { DemoControlsCard } from '@/components/admin/demo/demo-controls-card';
import { ActivityFeed } from '@/components/learn/profile/activity-feed';

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

  // Prefer the new OrgStats shape (CR.40+) which carries per-dept count +
  // completionRate; fall back to the completion-report's `byDepartment` if
  // stats failed to load so the dashboard degrades gracefully.
  const deptItems =
    stats && stats.byDepartment.length > 0
      ? stats.byDepartment.map((d) => ({
          name: d.name,
          value: Math.round(d.completionRate * 100),
          max: 100,
          sublabel: `${d.count} members`,
        }))
      : (report?.byDepartment ?? []).map((d) => ({
          name: d.name,
          value: Math.round(d.completionRate * 100),
          max: 100,
          sublabel: `${d.memberCount} members`,
        }));

  // Adoption-by-role and adoption-by-department tables use the new
  // stats.byRole / stats.byDepartment shape directly. Only render the
  // sections when the new shape is present — there is no completion-report
  // equivalent for byRole, so a `stats === null` outage simply hides the
  // section instead of showing stale data.
  const roleAdoptionItems = stats
    ? (
        Object.entries(stats.byRole) as Array<
          ['ADMIN' | 'MANAGER' | 'EMPLOYEE', { count: number; completionRate: number }]
        >
      )
        .map(([role, entry]) => ({
          role,
          count: entry.count,
          completionRate: entry.completionRate,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  const deptAdoptionItems = stats
    ? stats.byDepartment.map((d) => ({
        departmentId: d.departmentId,
        name: d.name,
        count: d.count,
        completionRate: d.completionRate,
      }))
    : [];

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
                iconName="users"
              />
              <StatCard
                title="Completion"
                value={stats ? stats.completionRate : '—'}
                format="percent"
                sublabel="Across assigned paths"
                iconName="trending-up"
              />
              <StatCard
                title="Pending enrollments"
                value={pendingInvites.length}
                sublabel={
                  pendingInvites.length > 0 ? 'Re-send or revoke from People' : 'All caught up'
                }
                iconName="mail"
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
                iconName="alert-triangle"
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

          <NumberedSection numeral="03" eyebrow="ADOPTION" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <MonoLabel>ADOPTION BY ROLE</MonoLabel>
                    <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                      COUNT · COMPLETION
                    </span>
                  </div>
                  {roleAdoptionItems.length > 0 ? (
                    <ul className="divide-y divide-ink-600">
                      {roleAdoptionItems.map((item) => (
                        <li
                          key={item.role}
                          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-100">
                            {item.role}
                          </span>
                          <div className="flex shrink-0 items-center gap-4 font-mono text-mono-sm tabular-nums text-paper-300">
                            <span className="text-paper-100">
                              <MissionNumber value={item.count} format="integer" />
                            </span>
                            <span className="w-16 text-right">
                              <MissionNumber value={item.completionRate} format="percent" />
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-6 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                      {stats === null ? 'STATS UNAVAILABLE' : 'NO ROLE DATA'}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <MonoLabel>ADOPTION BY DEPARTMENT</MonoLabel>
                    <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                      COUNT · COMPLETION
                    </span>
                  </div>
                  {deptAdoptionItems.length > 0 ? (
                    <ul className="divide-y divide-ink-600">
                      {deptAdoptionItems.map((item) => (
                        <li key={item.departmentId} className="py-3 first:pt-0 last:pb-0">
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="truncate text-body-sm font-medium text-paper-100">
                              {item.name}
                            </span>
                            <div className="flex shrink-0 items-center gap-4 font-mono text-mono-sm tabular-nums text-paper-300">
                              <span className="text-paper-100">
                                <MissionNumber value={item.count} format="integer" />
                              </span>
                              <span className="w-16 text-right">
                                <MissionNumber value={item.completionRate} format="percent" />
                              </span>
                            </div>
                          </div>
                          <div
                            className="h-1 w-full overflow-hidden rounded-data bg-ink-700"
                            role="progressbar"
                            aria-valuenow={Math.round(item.completionRate * 100)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${item.name}: ${Math.round(
                              item.completionRate * 100,
                            )}% complete`}
                          >
                            <div
                              className="h-full rounded-data bg-signal transition-[width] duration-500 ease-mission"
                              style={{
                                width: `${Math.round(item.completionRate * 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-6 text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                      {stats === null ? 'STATS UNAVAILABLE' : 'NO DEPARTMENT DATA'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </NumberedSection>

          <NumberedSection numeral="04" eyebrow="QUICK ACTIONS" className="space-y-6">
            <QuickActions />
          </NumberedSection>

          <NumberedSection numeral="05" eyebrow="ACTIVITY STREAM" className="space-y-6">
            <Card>
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center justify-between">
                  <MonoLabel>ORG-WIDE EVENTS</MonoLabel>
                  <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    LAST 20
                  </span>
                </div>
                <ActivityFeed userId={user?.organizationId ?? ''} limit={20} orgScope={true} />
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
