import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-client';
import { LearnerShell } from '@/components/learn/learner-shell';
import { ssrGet } from '@/lib/api/server-fetch';
import type { MyAssessment } from '@/lib/api/assessments';
import type { CurrentWeekResponse } from '@levelup/types';

/**
 * Routes that bypass the forced-baseline gate even for new EMPLOYEEs.
 * The assessment flow itself must be reachable, /legal pages are not learning
 * material, and the sign-out endpoint has to work or users get stuck.
 */
function bypassesForcedAssessment(pathname: string): boolean {
  if (pathname.startsWith('/assessment')) return true;
  if (pathname.startsWith('/legal')) return true;
  if (pathname === '/sign-out' || pathname.startsWith('/sign-out')) return true;
  return false;
}

/**
 * The forced-baseline gate.
 *
 * A brand-new EMPLOYEE is funneled through /assessment before any other
 * learn-app page renders. "Brand-new" = aiLevel still at the default BEGINNER
 * AND no recorded assessments AND no StudyPlan yet (the skip flow seeds an
 * empty plan, so a present plan means "already onboarded"). Managers and
 * admins are exempt. Failures while probing the API fall open — we don't
 * want a transient network blip to lock the whole app behind /assessment.
 */
async function shouldForceAssessment(
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
  aiLevel: string | undefined,
): Promise<boolean> {
  if (role !== 'EMPLOYEE') return false;
  if (aiLevel && aiLevel !== 'BEGINNER') return false;

  try {
    const [assessments, current] = await Promise.all([
      ssrGet<MyAssessment[]>('/assessments/me').catch(() => [] as MyAssessment[]),
      ssrGet<CurrentWeekResponse>('/study-plan/me/current-week').catch(
        () => ({ plan: null }) as CurrentWeekResponse,
      ),
    ]);
    if (assessments.length > 0) return false;
    if (current.plan !== null) return false;
    return true;
  } catch {
    return false;
  }
}

export default async function LearnGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const pathname = (await headers()).get('x-pathname') ?? '/learn';

  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
  }

  if (!bypassesForcedAssessment(pathname)) {
    const force = await shouldForceAssessment(user.role, user.aiLevel);
    if (force) {
      redirect('/assessment');
    }
  }

  const navUser = {
    name: user.name ?? user.email,
    email: user.email,
    role: user.role,
    userId: user.userId,
    organizationId: user.organizationId,
  };

  return <LearnerShell user={navUser}>{children}</LearnerShell>;
}
