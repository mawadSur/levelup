import type { Metadata } from 'next';
import { Skeleton } from '@levelup/ui';
import { Suspense } from 'react';
import { policies } from '@/lib/api';
import { PolicyPageClient } from './policy-page-client';

export const metadata: Metadata = {
  title: 'AI Policy — Admin',
};

export default async function AdminPolicyPage() {
  const [current, allVersions] = await Promise.all([
    policies.getCurrentPolicy(),
    policies.listPolicies(),
  ]);

  return (
    <Suspense fallback={<PolicyPageSkeleton />}>
      <PolicyPageClient current={current} allVersions={allVersions} />
    </Suspense>
  );
}

function PolicyPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
