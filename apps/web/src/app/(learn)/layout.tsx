import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-client';
import { LearnerShell } from '@/components/learn/learner-shell';

export default async function LearnGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/sign-in?redirect=%2Flearn');
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
