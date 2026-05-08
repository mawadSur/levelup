import type { Metadata } from 'next';
import { BookOpen, MessageSquare, FileText, Zap } from 'lucide-react';
import { insights } from '@/lib/api';
import { StatCard } from '@/components/admin/stat-card';
import { TopPromptsCard } from '@/components/admin/insights/top-prompts-card';
import { UsageTrendCard } from '@/components/admin/insights/usage-trend-card';
import { SavesPreventedCard } from '@/components/admin/insights/saves-prevented-card';

export const metadata: Metadata = {
  title: 'Insights — Admin',
};

export default async function AdminInsightsPage() {
  // Parallel-fetch all insights data
  const [topPrompts, usageTrend, savesPrevented, categoryMix] = await Promise.all([
    insights.getTopPrompts({ period: 'month', limit: 10 }),
    insights.getUsageTrend({ period: '30', interval: 'day' }),
    insights.getSavesPrevented(),
    insights.getCategoryMix({ period: 'month' }),
  ]);

  const { totals } = usageTrend;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <div>
        <h1
          className="text-[36px] font-bold leading-tight tracking-tight text-paper-100"
          style={{ fontFamily: 'Fraunces, Georgia, serif' }}
        >
          Insights
        </h1>
        <p className="mt-1 text-sm text-paper-300">
          What&apos;s working in your org. Updated every 5 minutes.
        </p>
      </div>

      {/* ── Stat row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Coach Sessions"
          value={totals.coachInvocations}
          sublabel="last 30 days"
          icon={MessageSquare}
          iconClassName="bg-[#7c2323]/10 text-[#7c2323]"
        />
        <StatCard
          title="Lessons Completed"
          value={totals.lessonsCompleted}
          sublabel="last 30 days"
          icon={BookOpen}
          iconClassName="bg-[#d97706]/10 text-[#d97706]"
        />
        <StatCard
          title="Prompts Saved"
          value={totals.promptsSaved}
          sublabel="last 30 days"
          icon={FileText}
          iconClassName="bg-signal/10 text-signal"
        />
        <StatCard
          title="XP Earned"
          value={totals.xpEarned}
          sublabel="last 30 days"
          icon={Zap}
          iconClassName="bg-success/10 text-success"
        />
      </div>

      {/* ── Usage trend chart ── */}
      <UsageTrendCard buckets={usageTrend.buckets} />

      {/* ── Top prompts ── */}
      <TopPromptsCard prompts={topPrompts.prompts} />

      {/* ── Bottom row: saves prevented + category mix ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Saves prevented */}
        <SavesPreventedCard data={savesPrevented} />

        {/* Category mix */}
        <div className="rounded-xl border border-ink-600 bg-ink-800 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-paper-100">Category Mix</h2>
            <p className="text-xs text-paper-300 mt-0.5">Prompts saved per category this month.</p>
          </div>

          {categoryMix.segments.length === 0 ? (
            <p className="text-sm text-paper-300">No prompt data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {categoryMix.segments.map((seg) => (
                <div key={seg.category} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 capitalize truncate text-paper-300">
                    {seg.category}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-ink-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-signal/70 transition-[width] duration-500"
                      style={{ width: `${Math.max(seg.pct, 2)}%` }}
                      role="progressbar"
                      aria-valuenow={seg.pct}
                      aria-valuemax={100}
                    />
                  </div>
                  <span className="tabular-nums text-xs text-paper-300 w-12 text-right">
                    {seg.count} ({seg.pct}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
