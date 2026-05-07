import type { Metadata } from 'next';
import { ResultSummary } from '@/components/assessment/result-summary';

export const metadata: Metadata = {
  title: 'Your assessment result',
};

export default function AssessmentResultPage() {
  return <ResultSummary />;
}
