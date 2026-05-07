/**
 * Privacy Controls page — CR.15 GDPR / CCPA Self-Service
 *
 * Server component. Handles the ?confirm=<id> query param to confirm a
 * deletion request server-side before rendering the page.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { privacy } from '@/lib/api';
import { DataExportRequest } from '@/components/learn/privacy/data-export-request';
import { DeletionRequest } from '@/components/learn/privacy/deletion-request';

export const metadata: Metadata = {
  title: 'Your data — LevelUp AI Academy',
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
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1
          className="text-4xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: 'Fraunces, serif', fontSize: '36px' }}
        >
          Your data
        </h1>
        <p className="mt-2 text-muted-foreground">
          Export everything we have. Or close your account.
        </p>
      </div>

      {/* Data Export card */}
      <DataExportRequest initialRequests={exports} />

      {/* Account Deletion card */}
      <DeletionRequest initialRequests={deletions} showConfirmedToast={confirmed} />
    </div>
  );
}
