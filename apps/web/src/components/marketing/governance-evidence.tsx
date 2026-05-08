import { DashboardMockGovernance } from './dashboard-mock-governance';
import { MonoLabel } from '@levelup/ui';

export function GovernanceEvidence() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr,1fr] lg:gap-16">
      <div>
        <h2 className="font-serif text-display-md italic text-paper-100">
          Evidence, not vibes.
        </h2>
        <p className="mt-6 max-w-reading text-body-lg text-paper-300">
          The dashboard your security team will actually open. Posture across the org. Risk
          ranked by department. A redacted feed of every trigger, with a one-click remediation
          path back into training. Quarterly PDF export your auditor can attach to the SOC 2
          evidence binder.
        </p>
        <ul className="mt-8 space-y-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
          <li className="flex items-baseline gap-3">
            <span className="text-paper-500">[01]</span>
            REAL-TIME CLASSIFICATION ON EVERY PROMPT
          </li>
          <li className="flex items-baseline gap-3">
            <span className="text-paper-500">[02]</span>
            DEPT-LEVEL RISK SCORES — NO INDIVIDUAL SURVEILLANCE
          </li>
          <li className="flex items-baseline gap-3">
            <span className="text-paper-500">[03]</span>
            REDACTED FEED · USER MASKED · 60-CHAR PROMPT TRUNCATION
          </li>
          <li className="flex items-baseline gap-3">
            <span className="text-paper-500">[04]</span>
            AUTO-ASSIGN REMEDIATION LESSON ON TRIGGER
          </li>
          <li className="flex items-baseline gap-3">
            <span className="text-paper-500">[05]</span>
            QUARTERLY EVIDENCE PDF · SOC 2-READY
          </li>
        </ul>
        <div className="mt-8 inline-flex items-center gap-3 rounded-sm border border-ink-600 bg-ink-800 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          <MonoLabel className="text-paper-500">
            IMMUTABLE AUDIT LOG · JWE-ENCRYPTED SESSIONS
          </MonoLabel>
        </div>
      </div>

      <div className="lg:pt-4">
        <DashboardMockGovernance />
      </div>
    </div>
  );
}
