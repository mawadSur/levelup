import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-client';
import { LearnerShell } from '@/components/learn/learner-shell';
import { ssrGet } from '@/lib/api/server-fetch';
import { getLocale, getTranslations, SUPPORTED_LOCALES } from '@/lib/i18n';
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
  // x-pathname is set by middleware. If it's null we're in an edge case
  // (middleware skipped the matcher, or NextResponse didn't propagate
  // mutated request headers, etc.). Previously this fell back to '/learn'
  // — which triggered an infinite /assessment redirect loop for new
  // EMPLOYEE signups: the gate didn't recognize /assessment, force-
  // redirected to /assessment, repeat. Treat null as "unknown path" and
  // skip the gate (open-fail) rather than risk a loop.
  const pathname = (await headers()).get('x-pathname');

  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(pathname ?? '/learn')}`);
  }

  if (pathname !== null && !bypassesForcedAssessment(pathname)) {
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

  // i18n (CR.38) — resolve nav labels server-side so the shell stays a
  // client component without pulling in the message bundles client-side.
  // Lane U (Wave 4) added `nav.team / nav.policy / nav.reports / nav.signUp`
  // and `dropdown.adminConsole / dropdown.language` to every locale bundle.
  // We resolve them here so the shell never holds an English fallback.
  const tNav = await getTranslations('nav');
  const tDropdown = await getTranslations('dropdown');
  const navLabels = {
    signOut: tNav('signOut'),
    signUp: tNav('signUp'),
    team: tNav('team'),
    policy: tNav('policy'),
    reports: tNav('reports'),
    adminConsole: tDropdown('adminConsole'),
    language: tDropdown('language'),
  };

  // Locale switcher (CR.39) — pass the active locale + supported list to the
  // shell so the in-menu `<select>` can navigate to `?locale=xx`.
  const currentLocale = await getLocale();

  return (
    <LearnerShell
      user={navUser}
      navLabels={navLabels}
      locale={{ current: currentLocale, supported: SUPPORTED_LOCALES }}
    >
      {children}
    </LearnerShell>
  );
}
