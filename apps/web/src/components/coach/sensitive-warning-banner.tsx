import { ShieldAlert } from 'lucide-react';
import { MonoLabel } from '@levelup/ui';

interface SensitiveWarningBannerProps {
  reason?: string;
}

/**
 * Inline banner shown above an assistant message when the coach flags
 * sensitive data in the user's input. Visual only — toasts are fired
 * separately by the chat component.
 */
export function SensitiveWarningBanner({ reason }: SensitiveWarningBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-sm border border-warning/40 bg-warning/10 px-4 py-3"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="space-y-1">
        <MonoLabel tone="signal" className="text-warning">
          SENSITIVE DATA DETECTED — REVIEW BEFORE SENDING
        </MonoLabel>
        <p className="text-body-sm text-paper-100">
          {reason ??
            'Your prompt looks like it may contain sensitive information (PII, secrets, or customer data). Consider redacting before sharing with public AI tools.'}
        </p>
      </div>
    </div>
  );
}
