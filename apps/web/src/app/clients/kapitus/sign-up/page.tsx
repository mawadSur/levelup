import type { Metadata } from 'next';
import { KapitusSignUpPanel } from '@/components/kapitus/auth-shell';

export const metadata: Metadata = {
  title: 'Create your Kapitus account',
};

export default function KapitusSignUpRoute() {
  return <KapitusSignUpPanel />;
}
