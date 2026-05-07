'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Separator } from '@levelup/ui';
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
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
      </div>

      {/* Stat row */}
      <StatRow report={completionReport} riskFlags={riskFlags} />

      {/* Department skill heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Department skill heatmap</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cells show member count. Color intensity = completion rate.
          </p>
        </CardHeader>
        <CardContent>
          <SkillsHeatmap cells={heatmapCells} />
        </CardContent>
      </Card>

      {/* Completion bars — 2-column on md+ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">By department</CardTitle>
          </CardHeader>
          <CardContent>
            <DeptCompletionBars byDepartment={completionReport.byDepartment} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">By path</CardTitle>
          </CardHeader>
          <CardContent>
            <PathCompletionBars byPath={completionReport.byPath} />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Risk flags */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Risk flags</h2>
          <p className="text-sm text-muted-foreground">
            Top 20 users by severity. Click a name to view their profile.
          </p>
        </div>
        <RiskFlagsTable flags={riskFlags} />
      </div>
    </div>
  );
}
