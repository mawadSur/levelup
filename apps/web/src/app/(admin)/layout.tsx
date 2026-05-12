import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-client';
import { organizations, anomaly } from '@/lib/api';
import { AdminShell } from '@/components/admin/admin-shell';

// All admin pages are authenticated and fetch live data — never statically prerender.
export const dynamic = 'force-dynamic';

export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    const pathname = (await headers()).get('x-pathname') ?? '/admin';
    redirect(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
  }

  // Employees have no admin access
  if (user.role === 'EMPLOYEE') {
    redirect('/learn');
  }

  // Fetch org name for the shell — best-effort (shell still renders on failure)
  let orgName = user.orgName ?? 'Your organisation';
  try {
    const org = await organizations.getMyOrg();
    orgName = org.name;
  } catch {
    // swallow — use the session-provided fallback
  }

  const shellUser = {
    email: user.email,
    name: user.name,
    role: user.role,
    userId: user.userId,
    organizationId: user.organizationId,
  };

  // Best-effort unacknowledged anomaly count for the nav badge
  let unackAnomalyCount = 0;
  try {
    unackAnomalyCount = await anomaly.countUnacknowledged();
  } catch {
    // swallow — badge simply won't appear
  }

  return (
    <AdminShell user={shellUser} orgName={orgName} unackAnomalyCount={unackAnomalyCount}>
      {children}
    </AdminShell>
  );
}
