import type { Metadata } from 'next';
import { MonoLabel } from '@levelup/ui';
import { adminOps, benchmarks } from '@/lib/api';
import type { BenchmarkMeResponse } from '@/lib/api/benchmarks';
import { BenchmarkParticipationCard } from '@/components/admin/settings/benchmark-participation-card';
import { ManagerDigestSettingsCard } from '@/components/admin/settings/manager-digest-settings-card';

export const metadata: Metadata = {
  title: 'Settings — Admin',
};

export default async function AdminSettingsPage() {
  // `benchmarks.getMyBenchmarks` already returns `optedOut` for the caller's
  // org. We use it as the source-of-truth so we don't have to plumb a new
  // field through /organizations/me.
  const [benchmarkData, digestSettings] = await Promise.all([
    benchmarks.getMyBenchmarks().catch(
      (): BenchmarkMeResponse => ({
        industry: null,
        optedOut: false,
        available: [],
        suppressed: [],
      }),
    ),
    adminOps
      .getManagerDigestSettings()
      .catch(() => ({ enabled: true, cadence: 'weekly' as const })),
  ]);

  return (
    <div className="mx-auto max-w-content space-y-10 px-6 py-10">
      <header className="space-y-2">
        <MonoLabel>SIGNAL / SETTINGS</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Settings</h1>
        <p className="max-w-reading text-body text-paper-300">
          Organisation-level preferences. Admins only.
        </p>
      </header>

      <section className="space-y-6">
        <ManagerDigestSettingsCard initial={digestSettings} />
        <BenchmarkParticipationCard initialOptOut={benchmarkData.optedOut} />
      </section>
    </div>
  );
}
