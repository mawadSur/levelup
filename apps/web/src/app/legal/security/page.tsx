import type { Metadata } from 'next';
import { LegalPage } from '../_legal-page';

export const metadata: Metadata = {
  title: 'Security',
  description: 'Security posture of the AI Academy.',
};

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="LEGAL · SECURITY"
      title="Security"
      lastUpdated="2026-05-12"
      intro="The academy follows a GLBA-aligned posture with SOC 2 Type I in progress. Sessions are encrypted in transit and at rest, customer data is never required to use the AI coach, and all coach interactions are scanned for sensitive content before being sent to the underlying model. Detected sensitive-data attempts are logged for audit and surface in the manager dashboard."
      contactEmail="security@kapitus.com"
    />
  );
}
