import type { Metadata } from 'next';
import { Activity, AlertTriangle, ShieldCheck, Users } from 'lucide-react';
import { MonoLabel, NumberedSection } from '@levelup/ui';
import { governance, anomaly } from '@/lib/api';
import type { AnomalyAlertDto } from '@/lib/api/anomaly';
import type {
  PostureResponse,
  RiskByDeptResponse,
  TriggerFeedResponse,
} from '@/lib/api/governance';
import { PostureCard } from '@/components/admin/governance/posture-card';
import { RiskByDeptTable } from '@/components/admin/governance/risk-by-dept-table';
import { TriggerFeed } from '@/components/admin/governance/trigger-feed';
import { EvidenceExportCard } from '@/components/admin/governance/evidence-export-card';
import { AnomalyList } from '@/components/admin/anomalies/anomaly-list';

export const metadata: Metadata = {
  title: 'Governance — Admin',
};

const SECURITY_RELEVANT_KINDS = new Set([
  'SENSITIVE_DATA_BURST',
  'COACH_USAGE_SPIKE',
  'PROMPT_CLONING_ABUSE',
  'PATH_BUILDER_ABUSE',
]);

export default async function AdminGovernancePage() {
  const [postureResult, riskResult, feedResult, anomaliesResult] = await Promise.allSettled([
    governance.getPosture(),
    governance.getRiskByDept(),
    governance.getTriggerFeed(50),
    anomaly.listAlerts({ unacknowledged: true, limit: 50 }),
  ]);

  const posture: PostureResponse | null =
    postureResult.status === 'fulfilled' ? postureResult.value : null;
  const risk: RiskByDeptResponse | null =
    riskResult.status === 'fulfilled' ? riskResult.value : null;
  const feed: TriggerFeedResponse | null =
    feedResult.status === 'fulfilled' ? feedResult.value : null;

  const allAnomalies: AnomalyAlertDto[] =
    anomaliesResult.status === 'fulfilled' ? anomaliesResult.value.items : [];
  const securityAnomalies = allAnomalies.filter((a) => SECURITY_RELEVANT_KINDS.has(a.kind));

  const windowDays = posture?.windowDays ?? risk?.windowDays ?? 30;

  return (
    <div className="mx-auto max-w-content space-y-12 px-6 py-10">
      <header className="animate-mission-in space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <MonoLabel>MISSION BRIEF · GOVERNANCE</MonoLabel>
          <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            LAST {windowDays} DAYS
          </span>
        </div>
        <h1 className="font-serif text-display-lg italic text-paper-100">
          AI usage telemetry, per department.
        </h1>
        <p className="max-w-reading text-body-lg text-paper-300">
          A CISO-grade view of where your team uses AI, what they share with it, and which
          departments need the next remediation cycle. All numbers are live; trigger details are
          redacted to <span className="font-mono">USER_&lt;6chars&gt;</span> by default.
        </p>
      </header>

      <NumberedSection numeral="I." eyebrow="POSTURE" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PostureCard
            title="Total interactions"
            value={posture?.totalAiInteractions ?? '—'}
            sublabel={`Coach prompts · ${windowDays}d`}
            icon={Activity}
          />
          <PostureCard
            title="Sensitive triggers"
            value={posture?.sensitiveDataTriggers ?? '—'}
            sublabel="Detected & redacted"
            icon={AlertTriangle}
            tone={posture && posture.sensitiveDataTriggers > 0 ? 'signal' : 'default'}
          />
          <PostureCard
            title="High-risk users"
            value={posture?.highRiskUsers ?? '—'}
            sublabel="≥3 triggers in window"
            icon={Users}
            tone={posture && posture.highRiskUsers > 0 ? 'danger' : 'success'}
          />
          <PostureCard
            title="Policy coverage"
            value={posture ? posture.policyCoveragePct / 100 : '—'}
            format="percent"
            sublabel="Trained on AI policy"
            icon={ShieldCheck}
            tone={posture && posture.policyCoveragePct >= 80 ? 'success' : 'signal'}
          />
        </div>
      </NumberedSection>

      <NumberedSection numeral="II." eyebrow="RISK BY DEPARTMENT" className="space-y-6">
        <RiskByDeptTable rows={risk?.rows ?? []} windowDays={windowDays} />
      </NumberedSection>

      <NumberedSection numeral="III." eyebrow="SENSITIVE DATA TRIGGER FEED" className="space-y-6">
        <TriggerFeed initialItems={feed?.items ?? []} />
      </NumberedSection>

      <NumberedSection numeral="IV." eyebrow="ANOMALIES" className="space-y-6">
        {securityAnomalies.length > 0 ? (
          <AnomalyList initialItems={securityAnomalies} />
        ) : (
          <div className="rounded-md border border-dashed border-ink-600 px-6 py-10 text-center">
            <MonoLabel className="text-paper-500">NO SECURITY-RELEVANT ANOMALIES OPEN</MonoLabel>
          </div>
        )}
      </NumberedSection>

      <NumberedSection numeral="V." eyebrow="EVIDENCE EXPORT" className="space-y-6">
        <EvidenceExportCard />
      </NumberedSection>
    </div>
  );
}
