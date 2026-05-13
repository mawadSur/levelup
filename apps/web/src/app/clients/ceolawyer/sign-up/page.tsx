import type { Metadata } from 'next';
import { CeoLawyerSignUpPanel } from '@/components/ceolawyer/auth-shell';

export const metadata: Metadata = {
  title: 'Get started with CEO Lawyer AI Academy',
};

export default function CeoLawyerSignUpRoute() {
  return <CeoLawyerSignUpPanel />;
}
