'use client';

import * as React from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Button, Card, CardContent, MissionLoadingBar, MonoLabel, toast } from '@levelup/ui';
import { governance } from '@/lib/api';
import type { ReportStatus } from '@/lib/api/governance';

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 200; // ~10 min at 3s

interface EvidenceExportCardProps {
  /** Default period label, e.g. "Q2 2026". */
  defaultPeriodLabel?: string;
  /** Default lookback window in days; matches the API default of 90. */
  defaultWindowDays?: number;
}

export function EvidenceExportCard({
  defaultPeriodLabel = 'Q2 2026',
  defaultWindowDays = 90,
}: EvidenceExportCardProps) {
  const [status, setStatus] = React.useState<ReportStatus | 'idle'>('idle');
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const pollRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, []);

  async function handleGenerate() {
    setStatus('queued');
    setSignedUrl(null);
    setErrorMsg(null);
    try {
      const { requestId } = await governance.generateReport({
        periodLabel: defaultPeriodLabel,
        windowDays: defaultWindowDays,
      });

      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        try {
          const res = await governance.getReportStatus(requestId);
          setStatus(res.status);
          if (res.status === 'ready' && res.signedUrl) {
            setSignedUrl(res.signedUrl);
            if (pollRef.current !== null) window.clearInterval(pollRef.current);
            pollRef.current = null;
            return;
          }
          if (res.status === 'failed') {
            setErrorMsg(res.error ?? 'Report generation failed.');
            if (pollRef.current !== null) window.clearInterval(pollRef.current);
            pollRef.current = null;
            return;
          }
          if (attempts >= MAX_POLL_ATTEMPTS) {
            setErrorMsg('Report generation timed out. Try again.');
            if (pollRef.current !== null) window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : 'Status check failed.');
          if (pollRef.current !== null) window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };

      // Run the first check immediately, then poll on the interval.
      void poll();
      pollRef.current = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start report.';
      setStatus('failed');
      setErrorMsg(message);
      toast({ title: 'Report request failed', description: message, variant: 'destructive' });
    }
  }

  const isWorking = status === 'queued' || status === 'generating';

  return (
    <>
      {isWorking && <MissionLoadingBar />}
      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-ink-700">
              <FileText className="h-5 w-5 text-signal" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <MonoLabel className="text-paper-500">
                {defaultPeriodLabel.toUpperCase()} · EVIDENCE
              </MonoLabel>
              <h3 className="mt-1 font-serif text-h3 italic text-paper-100">
                AI Governance Report
              </h3>
              <p className="mt-2 max-w-reading text-body-sm text-paper-300">
                A portrait-letter PDF covering posture, dept-risk, top-categories, and training
                completion across the last {defaultWindowDays} days. Suitable for SOC 2 evidence
                binders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => void handleGenerate()}
              disabled={isWorking}
            >
              {isWorking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  GENERATING…
                </>
              ) : (
                <>GENERATE {defaultPeriodLabel.toUpperCase()} AI GOVERNANCE REPORT →</>
              )}
            </Button>
            {signedUrl && (
              <Button asChild variant="secondary" size="lg">
                <a href={signedUrl} download target="_blank" rel="noreferrer noopener">
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  DOWNLOAD PDF
                </a>
              </Button>
            )}
          </div>

          {status !== 'idle' && (
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  status === 'ready'
                    ? 'bg-success'
                    : status === 'failed'
                      ? 'bg-danger'
                      : 'animate-pulse bg-signal'
                }`}
              />
              <MonoLabel
                className={
                  status === 'failed'
                    ? 'text-danger'
                    : status === 'ready'
                      ? 'text-success'
                      : 'text-signal'
                }
              >
                STATUS · {status.toUpperCase()}
              </MonoLabel>
              {errorMsg && <span className="font-mono text-mono-sm text-danger">— {errorMsg}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
