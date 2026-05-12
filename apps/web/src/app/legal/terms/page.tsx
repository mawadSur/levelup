import type { Metadata } from 'next';
import { LegalPage } from '../_legal-page';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms of use for the AI Academy.',
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="LEGAL · TERMS"
      title="Terms of use"
      lastUpdated="2026-05-12"
      intro="Use of the academy is a Kapitus employment benefit. Your access is governed by your employment agreement and the Kapitus acceptable-use policy. Content within the academy — lessons, prompt templates, and AI coach guidance — is internal training material; do not redistribute outside Kapitus without prior approval from Learning & Development."
      contactEmail="legal@kapitus.com"
    />
  );
}
