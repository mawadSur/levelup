import type { Metadata } from 'next';
import { CeoLawyerSignInPanel } from '@/components/ceolawyer/auth-shell';

export const metadata: Metadata = {
  title: 'Sign in to CEO Lawyer AI Academy',
};

interface PageProps {
  searchParams: Promise<{ redirect?: string; email?: string }>;
}

export default async function CeoLawyerSignInRoute({ searchParams }: PageProps) {
  const resolved = await searchParams;
  return <CeoLawyerSignInPanel redirect={resolved.redirect} initialEmail={resolved.email} />;
}
