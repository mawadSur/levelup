import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@levelup/ui';
import { getSessionUser } from '@/lib/auth-client';
import { organizations, users, invitations, departments } from '@/lib/api';
import { PeopleClient } from '@/components/admin/people-client';

export const metadata: Metadata = {
  title: 'People',
};

export default async function PeoplePage() {
  const sessionUser = await getSessionUser();
  const isAdmin = sessionUser?.role === 'ADMIN';

  const [orgResult, usersResult, invitesResult, deptsResult] = await Promise.allSettled([
    organizations.getMyOrg(),
    users.listUsers(),
    invitations.listInvites(),
    departments.listDepts(),
  ]);

  const org = orgResult.status === 'fulfilled' ? orgResult.value : null;
  const memberList = usersResult.status === 'fulfilled' ? usersResult.value : [];
  const inviteList = invitesResult.status === 'fulfilled' ? invitesResult.value : [];
  const deptList = deptsResult.status === 'fulfilled' ? deptsResult.value : [];

  const orgName = org?.name ?? sessionUser?.orgName ?? 'Your organisation';

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <Suspense fallback={<PeoplePageSkeleton />}>
        <PeopleClient
          memberList={memberList}
          inviteList={inviteList}
          deptList={deptList}
          orgName={orgName}
          isAdmin={isAdmin ?? false}
        />
      </Suspense>
    </div>
  );
}

function PeoplePageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-10 w-72" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
