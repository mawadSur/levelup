import type { Metadata } from 'next';
import { flags as flagsApi } from '@/lib/api';
import { FlagsTable } from '@/components/admin/flags/flags-table';

export const metadata: Metadata = {
  title: 'Feature Flags',
};

export default async function FlagsPage() {
  const initialFlags = await flagsApi.listFlags().catch(() => []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Feature Flags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toggle features and manage rollout percentages for this organisation. Org-specific
          overrides take priority over global defaults. Removing an override reverts to the global
          default (off if none exists).
        </p>
      </div>
      <FlagsTable initialFlags={initialFlags} />
    </div>
  );
}
