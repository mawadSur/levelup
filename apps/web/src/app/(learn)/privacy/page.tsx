/**
 * Privacy Controls page — CR.15 GDPR / CCPA Self-Service
 *
 * Server component. Handles the ?confirm=<id> query param to confirm a
 * deletion request server-side before rendering the page.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { privacy } from '@/lib/api';
import { MonoLabel, NumberedSection } from '@levelup/ui';
import { DataExportRequest } from '@/components/learn/privacy/data-export-request';
import { DeletionRequest } from '@/components/learn/privacy/deletion-request';

export const metadata: Metadata = {
  title: 'Your data',
};

interface PrivacyPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const params = await searchParams;
  const confirmId = typeof params['confirm'] === 'string' ? params['confirm'] : null;
  const confirmed = params['confirmed'] === '1';

  // Handle confirmation link — ?confirm=<deletionRequestId>
  if (confirmId) {
    try {
      await privacy.confirmDeletion(confirmId);
    } catch {
      // If confirmation fails (already confirmed, wrong user, etc.), just
      // redirect without the param — the page will still render correctly.
    }
    redirect('/privacy?confirmed=1');
  }

  // Fetch both datasets in parallel; degrade gracefully on error
  const [exportsResult, deletionsResult] = await Promise.allSettled([
    privacy.listExports(),
    privacy.listDeletions(),
  ]);

  const exports = exportsResult.status === 'fulfilled' ? exportsResult.value : [];
  const deletions = deletionsResult.status === 'fulfilled' ? deletionsResult.value : [];

  return (
    <div className="mx-auto max-w-reading space-y-12 px-6 py-12">
      <header className="space-y-3">
        <MonoLabel>OPERATOR DATA · GDPR / CCPA</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Your data.</h1>
        <p className="text-body-lg text-paper-300">
          Export everything we have on you, or close your account. Both requests are audited and
          honoured within 30 days.
        </p>
      </header>

      <NumberedSection numeral="01" eyebrow="DATA EXPORT" className="space-y-4">
        <DataExportRequest initialRequests={exports} />
      </NumberedSection>

      <NumberedSection numeral="02" eyebrow="ACCOUNT DELETION" className="space-y-4">
        <DeletionRequest initialRequests={deletions} showConfirmedToast={confirmed} />
      </NumberedSection>
    </div>
  );
}
