import type { Metadata } from 'next';
import { KapitusSignInPanel } from '@/components/kapitus/auth-shell';

export const metadata: Metadata = {
  title: 'Sign in to Kapitus',
};

interface PageProps {
  searchParams: Promise<{ redirect?: string; email?: string }>;
}

export default async function KapitusSignInRoute({ searchParams }: PageProps) {
  const resolved = await searchParams;
  return <KapitusSignInPanel redirect={resolved.redirect} initialEmail={resolved.email} />;
}
