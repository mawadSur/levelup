import type { Metadata } from 'next';
import { MonoLabel } from '@levelup/ui';
import { flags as flagsApi } from '@/lib/api';
import { FlagsTable } from '@/components/admin/flags/flags-table';

export const metadata: Metadata = {
  title: 'Feature Flags',
};

export default async function FlagsPage() {
  const initialFlags = await flagsApi.listFlags().catch(() => []);

  return (
    <div className="mx-auto max-w-content space-y-8 px-6 py-10">
      <header className="space-y-2">
        <MonoLabel>OPS / FLAGS</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Feature flags</h1>
        <p className="max-w-reading text-body text-paper-300">
          Toggle features and manage rollout percentages for this organisation. Org-specific
          overrides take priority over global defaults. Removing an override reverts to the global
          default (off if none exists).
        </p>
      </header>
      <FlagsTable initialFlags={initialFlags} />
    </div>
  );
}
