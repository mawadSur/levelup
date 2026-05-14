import type { Metadata } from 'next';
import { BookOpen, MessageSquare, FileText, Zap } from 'lucide-react';
import {
  Card,
  CardContent,
  MonoLabel,
  NumberedSection,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@levelup/ui';
import { insights, benchmarks } from '@/lib/api';
import { StatCard } from '@/components/admin/stat-card';
import { TopPromptsCard } from '@/components/admin/insights/top-prompts-card';
import { UsageTrendCard } from '@/components/admin/insights/usage-trend-card';
import { SavesPreventedCard } from '@/components/admin/insights/saves-prevented-card';
import { IndustryBenchmarkCard } from '@/components/admin/insights/industry-benchmark-card';
import type { BenchmarkMeResponse } from '@/lib/api/benchmarks';

export const metadata: Metadata = {
  title: 'Insights — Admin',
};

export default async function AdminInsightsPage() {
  // Benchmark fetch is allowed to fail (e.g. before the first weekly run) and
  // we surface an empty state rather than tank the whole insights page.
  const [topPrompts, usageTrend, savesPrevented, categoryMix, benchmarkData] = await Promise.all([
    insights.getTopPrompts({ period: 'month', limit: 10 }),
    insights.getUsageTrend({ period: '30', interval: 'day' }),
    insights.getSavesPrevented(),
    insights.getCategoryMix({ period: 'month' }),
    benchmarks.getMyBenchmarks().catch(
      (): BenchmarkMeResponse => ({
        industry: null,
        optedOut: false,
        available: [],
        suppressed: [],
      }),
    ),
  ]);

  const { totals } = usageTrend;

  return (
    <div className="mx-auto max-w-content space-y-10 px-6 py-10">
      <header className="space-y-2">
        <MonoLabel>SIGNAL / INSIGHTS</MonoLabel>
        <h1 className="font-serif text-display-md italic text-paper-100">Insights</h1>
        <p className="max-w-reading text-body text-paper-300">
          What&apos;s working in your org. Updated every 5 minutes.
        </p>
      </header>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="benchmark">Industry Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-12">
          <NumberedSection numeral="01" eyebrow="ACTIVITY · LAST 30 DAYS" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Coach sessions"
                value={totals.coachInvocations}
                sublabel="Last 30 days"
                icon={MessageSquare}
              />
              <StatCard
                title="Lessons completed"
                value={totals.lessonsCompleted}
                sublabel="Last 30 days"
                icon={BookOpen}
              />
              <StatCard
                title="Prompts saved"
                value={totals.promptsSaved}
                sublabel="Last 30 days"
                icon={FileText}
              />
              <StatCard
                title="XP earned"
                value={totals.xpEarned}
                sublabel="Last 30 days"
                icon={Zap}
              />
            </div>
          </NumberedSection>

          <NumberedSection numeral="02" eyebrow="USAGE TREND" className="space-y-4">
            <UsageTrendCard buckets={usageTrend.buckets} />
          </NumberedSection>

          <NumberedSection numeral="03" eyebrow="TOP PROMPTS" className="space-y-4">
            <TopPromptsCard prompts={topPrompts.prompts} />
          </NumberedSection>

          <NumberedSection numeral="04" eyebrow="POSTURE" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <SavesPreventedCard data={savesPrevented} />

              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-1">
                    <MonoLabel>CATEGORY MIX</MonoLabel>
                    <p className="text-body-sm text-paper-300">
                      Prompts saved per category this month.
                    </p>
                  </div>

                  {categoryMix.segments.length === 0 ? (
                    <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                      NO PROMPT DATA YET
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {categoryMix.segments.map((seg) => (
                        <li key={seg.category} className="flex items-center gap-3 text-body-sm">
                          <span className="w-24 shrink-0 truncate font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                            {seg.category}
                          </span>
                          <div className="h-1 flex-1 overflow-hidden rounded-data bg-ink-700">
                            <div
                              className="h-full bg-signal transition-[width] duration-500 ease-mission"
                              style={{ width: `${Math.max(seg.pct, 2)}%` }}
                              role="progressbar"
                              aria-valuenow={seg.pct}
                              aria-valuemax={100}
                            />
                          </div>
                          <span className="w-16 text-right font-mono text-mono-sm tabular-nums text-paper-100">
                            {seg.count} ({seg.pct}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </NumberedSection>
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-6">
          <IndustryBenchmarkCard data={benchmarkData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
