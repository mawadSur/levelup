'use client';

import * as React from 'react';
import { Card, CardContent, MonoLabel, NumberedSection, Separator } from '@levelup/ui';
import type { CompletionReport, DeptHeatmapCell, RiskFlag } from '@/lib/api/reports';
import { PeriodSelector, type Period } from '@/components/admin/reports/period-selector';
import { StatRow } from '@/components/admin/reports/stat-row';
import { SkillsHeatmap } from '@/components/admin/reports/skills-heatmap';
import { DeptCompletionBars } from '@/components/admin/reports/dept-completion-bars';
import { PathCompletionBars } from '@/components/admin/reports/path-completion-bars';
import { RiskFlagsTable } from '@/components/admin/reports/risk-flags-table';

interface ReportsPageClientProps {
  completionReport: CompletionReport;
  heatmapCells: DeptHeatmapCell[];
  riskFlags: RiskFlag[];
}

export function ReportsPageClient({
  completionReport,
  heatmapCells,
  riskFlags,
}: ReportsPageClientProps) {
  const [period, setPeriod] = React.useState<Period>('30d');
  const [customStart, setCustomStart] = React.useState('');
  const [customEnd, setCustomEnd] = React.useState('');

  return (
    <div className="mx-auto max-w-content space-y-12 px-6 py-10">
      <header className="space-y-4">
        <div className="space-y-2">
          <MonoLabel>TELEMETRY</MonoLabel>
          <h1 className="font-serif text-display-md italic text-paper-100">Reports</h1>
          <p className="max-w-reading text-body text-paper-300">
            Monitor learning progress, identify skill gaps, and act on risk signals.
          </p>
        </div>
        <PeriodSelector
          period={period}
          onPeriodChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomChange={(s, e) => {
            setCustomStart(s);
            setCustomEnd(e);
          }}
        />
      </header>

      <NumberedSection numeral="01" eyebrow="OVERVIEW" className="space-y-4">
        <StatRow report={completionReport} riskFlags={riskFlags} />
      </NumberedSection>

      <NumberedSection numeral="02" eyebrow="SKILL HEATMAP" className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <MonoLabel>BY DEPARTMENT × SKILL</MonoLabel>
                <p className="text-body-sm text-paper-300">
                  Cells show member count. Color intensity tracks completion rate.
                </p>
              </div>
            </div>
            <SkillsHeatmap cells={heatmapCells} />
          </CardContent>
        </Card>
      </NumberedSection>

      <NumberedSection numeral="03" eyebrow="COMPLETION BREAKDOWN" className="space-y-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4 p-6">
              <MonoLabel>BY DEPARTMENT</MonoLabel>
              <DeptCompletionBars byDepartment={completionReport.byDepartment} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-6">
              <MonoLabel>BY PATH</MonoLabel>
              <PathCompletionBars byPath={completionReport.byPath} />
            </CardContent>
          </Card>
        </div>
      </NumberedSection>

      <Separator />

      <NumberedSection numeral="04" eyebrow="RISK FLAGS" className="space-y-4">
        <p className="max-w-reading text-body-sm text-paper-300">
          Top 20 users by severity. Click a name to drill into their profile.
        </p>
        <RiskFlagsTable flags={riskFlags} />
      </NumberedSection>
    </div>
  );
}
