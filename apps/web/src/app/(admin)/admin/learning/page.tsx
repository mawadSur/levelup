import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@levelup/ui';
import { paths, users, departments } from '@/lib/api';
import { LearningPageClient } from './learning-page-client';

export const metadata: Metadata = {
  title: 'Learning — Admin',
};

export default async function AdminLearningPage() {
  const [allPaths, allUsers, allDepts] = await Promise.all([
    paths.listPaths(),
    users.listUsers(),
    departments.listDepts(),
  ]);

  return (
    <Suspense fallback={<LearningPageSkeleton />}>
      <LearningPageClient initialPaths={allPaths} users={allUsers} departments={allDepts} />
    </Suspense>
  );
}

function LearningPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-10 w-80" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
