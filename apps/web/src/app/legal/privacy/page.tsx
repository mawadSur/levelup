import type { Metadata } from 'next';
import { LegalPage } from '../_legal-page';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'Privacy policy for the AI Academy.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="LEGAL · PRIVACY"
      title="Privacy policy"
      lastUpdated="2026-05-12"
      intro="The academy processes the minimum data needed to deliver training and report progress. Lesson completions, quiz attempts, prompt history, and AI coach conversations are stored against your user account. Sensitive customer data is never required to use the academy; the AI coach actively flags and refuses to process content that looks like loan applicant information, PII, or credentials."
      contactEmail="privacy@kapitus.com"
    />
  );
}
