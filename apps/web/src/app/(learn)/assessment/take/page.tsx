import type { Metadata } from 'next';
import { AssessmentRunner } from '@/components/assessment/assessment-runner';

export const metadata: Metadata = {
  title: 'Take the assessment',
};

export default function AssessmentTakePage() {
  return <AssessmentRunner />;
}
